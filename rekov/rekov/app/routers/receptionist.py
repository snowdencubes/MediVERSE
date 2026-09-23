from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Optional
from pydantic import BaseModel
from app.services.queue_service import queue_service
from app.schemas.kiosk_schemas import Doctor, Department, QueueTicket
from app.core.database import SessionLocal, TicketModel
import uuid

router = APIRouter()

class PricingUpdateRequest(BaseModel):
    doctor_id: str
    new_fee: float

class DoctorCreateRequest(BaseModel):
    name: str
    department_id: str
    specialty: str
    room_number: str
    consultation_fee: float
    experience_years: int
    arrival_time: Optional[str] = None

class DepartmentCreateRequest(BaseModel):
    name: str
    code: str
    description: str

class TicketStatusUpdate(BaseModel):
    status: str

class PatientUpdateRequest(BaseModel):
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None

@router.get("/doctors", response_model=List[Doctor])
def get_doctors():
    return list(queue_service.doctors.values())

@router.post("/doctors", response_model=Doctor)
def add_doctor(req: DoctorCreateRequest):
    if req.department_id not in queue_service.departments:
        raise HTTPException(status_code=400, detail="Department not found")
        
    doc_id = f"doc_{uuid.uuid4().hex[:6]}"
    new_doc = Doctor(
        id=doc_id,
        name=req.name,
        department_id=req.department_id,
        specialty=req.specialty,
        room_number=req.room_number,
        is_available=True,
        estimated_wait_minutes=5,
        consultation_fee=req.consultation_fee,
        rating=5.0,
        experience_years=req.experience_years,
        arrival_time=req.arrival_time
    )
    queue_service.doctors[doc_id] = new_doc
    queue_service.save_data()
    return new_doc

@router.put("/doctors/{doctor_id}/arrival")
def update_doctor_arrival(doctor_id: str, arrival_time: str):
    if doctor_id not in queue_service.doctors:
        raise HTTPException(status_code=404, detail="Doctor not found")
    queue_service.doctors[doctor_id].arrival_time = arrival_time
    queue_service.save_data()
    return queue_service.doctors[doctor_id]

@router.post("/departments", response_model=Department)
def add_department(req: DepartmentCreateRequest):
    dep_id = f"dep_{req.code.lower()}"
    new_dep = Department(
        id=dep_id,
        name=req.name,
        code=req.code.upper(),
        description=req.description,
        active_doctors_count=0,
        wait_time_minutes=0
    )
    queue_service.departments[dep_id] = new_dep
    queue_service.save_data()
    return new_dep

@router.put("/pricing", response_model=Doctor)
def update_pricing(req: PricingUpdateRequest):
    if req.doctor_id not in queue_service.doctors:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    queue_service.doctors[req.doctor_id].consultation_fee = req.new_fee
    queue_service.save_data()
    return queue_service.doctors[req.doctor_id]


# --- New Receptionist Ticket Management Endpoints ---

@router.get("/tickets/live", response_model=List[QueueTicket])
def get_live_tickets():
    db = SessionLocal()
    try:
        # Fetch tickets that are recently generated or waiting
        tickets = db.query(TicketModel).filter(TicketModel.status.in_(["WAITING", "NOW_CALLING", "IN_CONSULTATION"])).order_by(TicketModel.id.desc()).all()
        return [queue_service._model_to_schema(t) for t in tickets]
    finally:
        db.close()

@router.get("/tickets/history", response_model=List[QueueTicket])
def get_ticket_history(limit: int = 50):
    db = SessionLocal()
    try:
        # Fetch resolved tickets
        tickets = db.query(TicketModel).filter(TicketModel.status.in_(["SUCCESS", "FAILED", "COMPLETED"])).order_by(TicketModel.id.desc()).limit(limit).all()
        return [queue_service._model_to_schema(t) for t in tickets]
    finally:
        db.close()

@router.get("/tickets/search", response_model=List[QueueTicket])
def search_tickets(query: str = Query(..., min_length=1)):
    db = SessionLocal()
    try:
        q = query.strip()
        # Search by ticket ID or token number
        tickets = db.query(TicketModel).filter(
            (TicketModel.ticket_id.ilike(f"%{q}%")) | 
            (TicketModel.token_number.ilike(f"%{q}%")) |
            (TicketModel.patient_name.ilike(f"%{q}%"))
        ).all()
        
        # Search by phone number (strip spaces or special chars)
        clean_phone = "".join(filter(str.isdigit, q))
        if clean_phone and len(clean_phone) >= 4:
            phone_tickets = db.query(TicketModel).filter(TicketModel.patient_phone.like(f"%{clean_phone}%")).all()
            # Merge results and distinct by ID
            merged = {t.id: t for t in tickets + phone_tickets}
            tickets = list(merged.values())
            
        tickets.sort(key=lambda t: t.id, reverse=True)
        return [queue_service._model_to_schema(t) for t in tickets]
    finally:
        db.close()

@router.put("/tickets/{ticket_id}/status", response_model=QueueTicket)
def resolve_ticket(ticket_id: str, req: TicketStatusUpdate):
    if req.status not in ["SUCCESS", "FAILED", "WAITING", "COMPLETED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    t = queue_service.update_status(ticket_id, req.status)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t

@router.put("/patients/{ticket_id}", response_model=QueueTicket)
def update_patient_details(ticket_id: str, req: PatientUpdateRequest):
    db = SessionLocal()
    try:
        t = db.query(TicketModel).filter(TicketModel.ticket_id == ticket_id).first()
        if not t:
            t = db.query(TicketModel).filter(TicketModel.token_number == ticket_id).first()
            
        if not t:
            raise HTTPException(status_code=404, detail="Ticket/Patient not found")
            
        if req.patient_name:
            t.patient_name = req.patient_name
        if req.patient_phone:
            t.patient_phone = req.patient_phone
            
        t.synced = False
        db.add(t)
        db.commit()
        db.refresh(t)
        return queue_service._model_to_schema(t)
    finally:
        db.close()
