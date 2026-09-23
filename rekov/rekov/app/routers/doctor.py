from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.schemas.kiosk_schemas import Doctor
from app.services.queue_service import queue_service

router = APIRouter(prefix="/doctors", tags=["Doctors"])

@router.get("", response_model=List[Doctor])
def list_all_doctors():
    return list(queue_service.doctors.values())

@router.post("/{doctor_id}/toggle-availability", response_model=Doctor)
def toggle_doctor_availability(doctor_id: str):
    if doctor_id in queue_service.doctors:
        doc = queue_service.doctors[doctor_id]
        doc.is_available = not doc.is_available
        return doc
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Doctor not found")

class ScheduleUpdateRequest(BaseModel):
    shift_schedule: str

@router.post("/{doctor_id}/schedule", response_model=Doctor)
def update_doctor_schedule(doctor_id: str, req: ScheduleUpdateRequest):
    if doctor_id in queue_service.doctors:
        doc = queue_service.doctors[doctor_id]
        doc.shift_schedule = req.shift_schedule
        queue_service.save_data()
        return doc
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Doctor not found")

class PresenceUpdateRequest(BaseModel):
    is_present: bool

@router.post("/{doctor_id}/presence", response_model=Doctor)
def update_doctor_presence(doctor_id: str, req: PresenceUpdateRequest):
    if doctor_id in queue_service.doctors:
        doc = queue_service.doctors[doctor_id]
        doc.is_available = req.is_present
        import datetime
        if req.is_present:
            doc.arrival_time = datetime.datetime.now().strftime("%I:%M %p")
        else:
            doc.arrival_time = None
        queue_service.save_data()
        return doc
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Doctor not found")
