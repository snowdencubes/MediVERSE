from fastapi import APIRouter, HTTPException, UploadFile, File
import requests
import os
from dotenv import load_dotenv
load_dotenv()
from typing import List
from app.schemas.kiosk_schemas import (
    Department, Doctor, HealthComboPackage, TicketCreateRequest, QueueTicket
)
from app.services.queue_service import queue_service

router = APIRouter(prefix="/kiosk", tags=["Kiosk"])

@router.get("/departments", response_model=List[Department])
def get_departments():
    return list(queue_service.departments.values())

@router.get("/doctors", response_model=List[Doctor])
def get_doctors(department_id: str = None):
    doctors = list(queue_service.doctors.values())
    if department_id:
        doctors = [d for d in doctors if d.department_id == department_id]
    return doctors

@router.get("/combos", response_model=List[HealthComboPackage])
def get_health_combos():
    return list(queue_service.health_combos.values())

@router.post("/ticket", response_model=QueueTicket)
def create_kiosk_ticket(request: TicketCreateRequest):
    ticket = queue_service.create_ticket(request)
    return ticket

from pydantic import BaseModel
class VoiceIntentRequest(BaseModel):
    text: str

@router.post("/voice-intent")
def analyze_voice_intent(request: VoiceIntentRequest):
    text = request.text.lower()
    
    # Basic Hinglish / Hindi / English intent mapper
    # Mappings to known departments
    intents = {
        "dep_card": ["dil", "heart", "seena", "chest", "dhadkan", "cardio", "dharkan", "saans"],
        "dep_ortho": ["haddi", "bone", "dard", "pair", "joint", "back", "kamar", "knee", "ghutna"],
        "dep_ped": ["bacha", "child", "kid", "baby", "pediatric", "bache"],
        "dep_gen": ["bukhar", "fever", "sardi", "cold", "cough", "khasi", "pet", "stomach", "general", "doctor"]
    }
    
    matched_dept = None
    
    for dept_id, keywords in intents.items():
        if any(kw in text for kw in keywords):
            matched_dept = dept_id
            break
            
    if not matched_dept:
        # Fallback to general
        matched_dept = "dep_gen"
        
    return {
        "intent": "book_appointment",
        "department_id": matched_dept,
        "raw_text": request.text
    }

from app.services.ai_service import transcribe_audio_hf, triage_symptoms_hf

@router.post("/voice-audio")
async def analyze_voice_audio(file: UploadFile = File(...)):
    try:
        audio_bytes = await file.read()
        
        # 1. Voice-to-Text via Hugging Face Whisper
        transcript = transcribe_audio_hf(audio_bytes)
        if not transcript:
            raise HTTPException(status_code=400, detail="Could not transcribe audio")
            
        # 2. Triage via Hugging Face LLM (Mistral/Llama)
        triage_data = triage_symptoms_hf(transcript)
        
        # We need to map the guessed department to an actual department_id if possible
        dept_guess = triage_data.get("department", "General").lower()
        matched_dept = "dep_gen"
        if "cardio" in dept_guess or "heart" in dept_guess:
            matched_dept = "dep_card"
        elif "ortho" in dept_guess or "bone" in dept_guess:
            matched_dept = "dep_ortho"
        elif "pediatric" in dept_guess or "child" in dept_guess:
            matched_dept = "dep_ped"
            
        return {
            "intent": "book_appointment",
            "department_id": matched_dept,
            "raw_text": transcript,
            "issue": triage_data.get("issue", transcript),
            "is_emergency": triage_data.get("is_emergency", False)
        }
    except Exception as e:
        print("Voice Processing Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history", response_model=List[QueueTicket])
def get_patient_history(lookup: str):
    from app.core.database import SessionLocal, TicketModel
    db = SessionLocal()
    try:
        # Lookup by token_number or patient_phone
        tickets = db.query(TicketModel).filter(
            (TicketModel.token_number == lookup) | (TicketModel.patient_phone == lookup)
        ).order_by(TicketModel.created_at.desc()).all()
        return [queue_service._model_to_schema(t) for t in tickets]
    finally:
        db.close()

from fastapi import Request
from fastapi.responses import PlainTextResponse

@router.get("/whatsapp/webhook")
async def verify_whatsapp_webhook(request: Request):
    """Verify webhook for Meta WhatsApp API"""
    verify_token = "rekov_verify_123"
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode and token:
        if mode == "subscribe" and token == verify_token:
            return PlainTextResponse(content=challenge, status_code=200)
    raise HTTPException(status_code=403, detail="Verification failed")

@router.post("/whatsapp/webhook")
async def receive_whatsapp_message(request: Request):
    from app.core.database import SessionLocal, WhatsappSession
    try:
        data = await request.json()
        entry = data.get("entry", [])[0]
        changes = entry.get("changes", [])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])
        
        if messages:
            phone_number = messages[0].get("from")
            # If the user sent a message, we queue them for the kiosk
            if phone_number:
                db = SessionLocal()
                try:
                    new_session = WhatsappSession(phone_number=phone_number, status="pending")
                    db.add(new_session)
                    db.commit()
                finally:
                    db.close()
                return {"status": "success"}
    except Exception as e:
        print("WhatsApp Webhook Error:", e)
        
    return {"status": "ignored"}

@router.get("/whatsapp/latest")
async def get_latest_whatsapp_session():
    from app.core.database import SessionLocal, WhatsappSession
    db = SessionLocal()
    try:
        session = db.query(WhatsappSession).filter(WhatsappSession.status == "pending").order_by(WhatsappSession.created_at.desc()).first()
        if session:
            session.status = "consumed"
            db.commit()
            return {"status": "found", "phone_number": session.phone_number}
        return {"status": "waiting"}
    finally:
        db.close()
