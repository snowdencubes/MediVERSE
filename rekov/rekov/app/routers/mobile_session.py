"""
Mobile Session Router
---------------------
Enables the Smart QR pairing flow:
  1. Kiosk calls POST /sessions/create  → gets a session_id (valid 30s)
  2. Kiosk encodes session_id into a QR code pointing to /mobile-form?session=<id>
  3. Patient scans on phone, fills form, hits POST /sessions/{id}/submit
  4. Kiosk polls GET /sessions/{id} — detects status=SUBMITTED and auto-fills
  5. Patient optionally uploads documents via POST /sessions/{id}/upload
"""

import uuid
import json
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.core.database import SessionLocal, MobileSession
from app.services.storage_service import get_supabase_client

router = APIRouter(prefix="/sessions", tags=["Mobile Session QR"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class SessionCreateResponse(BaseModel):
    session_id: str
    expires_at: str
    qr_url_path: str  # relative path for QR, e.g. /mobile-form?session=<id>


class SessionStatusResponse(BaseModel):
    session_id: str
    status: str              # PENDING | SUBMITTED | EXPIRED
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_dob: Optional[str] = None
    department_id: Optional[str] = None
    chief_complaint: Optional[str] = None
    documents: list = []
    created_at: str
    expires_at: str


class SessionSubmitRequest(BaseModel):
    patient_name: str
    patient_phone: str
    patient_dob: Optional[str] = None
    department_id: Optional[str] = None
    chief_complaint: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _session_to_response(s: MobileSession) -> SessionStatusResponse:
    docs = []
    try:
        docs = json.loads(s.documents or "[]")
    except Exception:
        pass
    return SessionStatusResponse(
        session_id=s.session_id,
        status=s.status,
        patient_name=s.patient_name,
        patient_phone=s.patient_phone,
        patient_dob=s.patient_dob,
        department_id=s.department_id,
        chief_complaint=s.chief_complaint,
        documents=docs,
        created_at=s.created_at.isoformat() if s.created_at else "",
        expires_at=s.expires_at.isoformat() if s.expires_at else "",
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/create", response_model=SessionCreateResponse)
def create_session():
    """Create a new short-lived pairing session for the QR code."""
    db = SessionLocal()
    try:
        sid = str(uuid.uuid4())
        now = datetime.utcnow()
        session = MobileSession(
            session_id=sid,
            status="PENDING",
            created_at=now,
            expires_at=now + timedelta(seconds=30),
        )
        db.add(session)
        db.commit()
        return SessionCreateResponse(
            session_id=sid,
            expires_at=session.expires_at.isoformat(),
            qr_url_path=f"/mobile-form?session={sid}",
        )
    finally:
        db.close()


@router.get("/{session_id}", response_model=SessionStatusResponse)
def get_session(session_id: str):
    """Poll this endpoint from the kiosk to check if the patient submitted the form."""
    db = SessionLocal()
    try:
        s = db.query(MobileSession).filter(MobileSession.session_id == session_id).first()
        if not s:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Auto-expire if past time and still PENDING
        if s.status == "PENDING" and datetime.utcnow() > s.expires_at:
            s.status = "EXPIRED"
            db.commit()
        
        return _session_to_response(s)
    finally:
        db.close()


@router.post("/{session_id}/submit", response_model=SessionStatusResponse)
def submit_session(session_id: str, payload: SessionSubmitRequest):
    """Called from the phone form. Stores patient data and marks session SUBMITTED."""
    db = SessionLocal()
    try:
        s = db.query(MobileSession).filter(MobileSession.session_id == session_id).first()
        if not s:
            raise HTTPException(status_code=404, detail="Session not found")
        if s.status == "EXPIRED":
            raise HTTPException(status_code=410, detail="Session has expired. Please scan a fresh QR code.")
        
        s.patient_name = payload.patient_name
        s.patient_phone = payload.patient_phone
        s.patient_dob = payload.patient_dob
        s.department_id = payload.department_id
        s.chief_complaint = payload.chief_complaint
        s.status = "SUBMITTED"
        # Extend expiry so documents can still be uploaded after form submit
        s.expires_at = datetime.utcnow() + timedelta(hours=2)
        
        db.commit()
        return _session_to_response(s)
    finally:
        db.close()


@router.post("/{session_id}/upload")
async def upload_document(
    session_id: str,
    file: UploadFile = File(...),
    doc_type: str = Form(default="document"),
):
    """Upload a patient document (prescription, insurance, ID) to Supabase Storage."""
    db = SessionLocal()
    try:
        s = db.query(MobileSession).filter(MobileSession.session_id == session_id).first()
        if not s:
            raise HTTPException(status_code=404, detail="Session not found")
        
        file_bytes = await file.read()
        
        # Determine mime type from filename
        filename = file.filename or f"doc_{uuid.uuid4().hex[:8]}"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
        content_type = file.content_type or "application/octet-stream"
        
        dest_path = f"patient-docs/{session_id}/{uuid.uuid4().hex[:8]}_{filename}"
        
        public_url = None
        supabase = get_supabase_client()
        if supabase:
            try:
                supabase.storage.from_("patient-documents").upload(
                    path=dest_path,
                    file=file_bytes,
                    file_options={"content-type": content_type, "upsert": "true"},
                )
                public_url = supabase.storage.from_("patient-documents").get_public_url(dest_path)
            except Exception as e:
                print(f"[DOC UPLOAD] Supabase error: {e}")
        
        # Fallback: save locally if Supabase not available
        if not public_url:
            local_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "patient_docs", session_id)
            os.makedirs(local_dir, exist_ok=True)
            local_path = os.path.join(local_dir, filename)
            with open(local_path, "wb") as f:
                f.write(file_bytes)
            public_url = f"/local-doc/{session_id}/{filename}"  # served as static or placeholder

        # Append to documents list
        docs = []
        try:
            docs = json.loads(s.documents or "[]")
        except Exception:
            pass
        docs.append({"name": filename, "url": public_url, "type": doc_type})
        s.documents = json.dumps(docs)
        db.commit()
        
        return {"success": True, "url": public_url, "name": filename, "type": doc_type}
    finally:
        db.close()


@router.get("/{session_id}/documents")
def get_documents(session_id: str):
    """Get list of uploaded documents for a session."""
    db = SessionLocal()
    try:
        s = db.query(MobileSession).filter(MobileSession.session_id == session_id).first()
        if not s:
            raise HTTPException(status_code=404, detail="Session not found")
        docs = []
        try:
            docs = json.loads(s.documents or "[]")
        except Exception:
            pass
        return {"session_id": session_id, "documents": docs}
    finally:
        db.close()
