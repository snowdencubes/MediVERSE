import secrets
from fastapi import APIRouter, HTTPException
from app.schemas.kiosk_schemas import AuthLoginRequest, AuthLoginResponse
from app.services.queue_service import queue_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=AuthLoginResponse)
def login(req: AuthLoginRequest):
    """Authenticate a Doctor or Receptionist using easy names, departments, or CSV data."""
    u = req.username.strip().lower()
    p = req.pin.strip()

    # 1. Easy Receptionist Login ('rec', 'receptionist', 'admin' with PIN 12345)
    if u in ("rec", "receptionist", "rec_1", "rec_2", "admin", "reception"):
        if p in ("12345", "1234", "admin"):
            return AuthLoginResponse(
                token=secrets.token_hex(32),
                role="RECEPTIONIST",
                user_id="rec_1",
                name="Head Receptionist"
            )

    # Check against loaded CSV receptionists
    for rec in queue_service.receptionists.values():
        rec_id_clean = rec.id.lower()
        rec_name_clean = rec.name.lower()
        if rec_id_clean == u or rec_name_clean == u or u in rec_name_clean:
            if p in (rec.pin, "12345", "1234", "admin"):
                return AuthLoginResponse(
                    token=secrets.token_hex(32),
                    role="RECEPTIONIST",
                    user_id=rec.id,
                    name=rec.name
                )

    # 2. Easy Department Shortcuts for Doctors (e.g. 'gen', 'card', 'ped', 'ortho' with PIN 12345)
    DEPT_MAP = {
        "gen": "dep_gen", "general": "dep_gen",
        "card": "dep_card", "cardio": "dep_card", "cardiology": "dep_card",
        "ortho": "dep_ortho", "orthopedic": "dep_ortho", "orthopedics": "dep_ortho",
        "ped": "dep_ped", "pedia": "dep_ped", "pediatric": "dep_ped", "pediatrics": "dep_ped",
        "neuro": "dep_neuro", "neurology": "dep_neuro",
        "ophta": "dep_ophta", "eye": "dep_ophta",
        "ent": "dep_ent",
        "derm": "dep_derm", "skin": "dep_derm", "dermatology": "dep_derm",
        "gyn": "dep_gyn", "gynecology": "dep_gyn",
        "gastro": "dep_gastro",
        "onc": "dep_onc", "cancer": "dep_onc", "oncology": "dep_onc",
        "pulm": "dep_pulm", "chest": "dep_pulm", "pulmonology": "dep_pulm",
        "psych": "dep_psych", "psychiatry": "dep_psych",
        "uro": "dep_uro", "urology": "dep_uro",
        "pharm": "dep_pharm", "pharmacy": "dep_pharm", "rx": "dep_pharm",
        "emg": "dep_emg", "emergency": "dep_emg"
    }

    target_dept = DEPT_MAP.get(u)
    if target_dept or u.startswith("dep_"):
        dept_id = target_dept or u
        if p in ("12345", "1234"):
            # Find the primary active doctor for this department
            matched_doc = next((d for d in queue_service.doctors.values() if d.department_id == dept_id), None)
            if matched_doc:
                return AuthLoginResponse(
                    token=secrets.token_hex(32),
                    role="DOCTOR",
                    user_id=matched_doc.id,
                    name=f"{matched_doc.name} ({matched_doc.specialty})"
                )

    # 3. Check individual Doctors by ID, full name, or first name
    for doc in queue_service.doctors.values():
        doc_id_clean = doc.id.lower()
        doc_name_clean = doc.name.lower()
        # Also extract first name (e.g. 'amit' from 'Dr. Amit Sharma')
        name_parts = [part.strip(".") for part in doc_name_clean.split() if part not in ("dr", "dr.")]
        
        matches_user = (
            doc_id_clean == u or 
            doc_name_clean == u or 
            u in name_parts or 
            u in doc_name_clean
        )

        if matches_user:
            if p in (doc.pin, "12345", "1234"):
                return AuthLoginResponse(
                    token=secrets.token_hex(32),
                    role="DOCTOR",
                    user_id=doc.id,
                    name=doc.name
                )

    raise HTTPException(status_code=401, detail="Invalid credentials. Use 'rec' for receptionist or department ('gen', 'card', 'ped'...) with PIN 12345")

@router.get("/verify")
def verify_session():
    """Placeholder session verification endpoint."""
    return {"status": "ok", "message": "Session active"}
