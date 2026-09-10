from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.schemas.kiosk_schemas import (
    QueueBoardResponse, QueueTicket, CallNextRequest, UpdateTicketStatusRequest
)
from app.services.queue_service import queue_service

router = APIRouter(prefix="/queue", tags=["Queue"])

@router.get("/board", response_model=QueueBoardResponse)
def get_queue_board():
    return queue_service.get_queue_board()

@router.post("/call-next", response_model=Optional[QueueTicket])
def call_next_patient(req: CallNextRequest):
    ticket = queue_service.call_next(doctor_id=req.doctor_id, room_number=req.room_number)
    return ticket

@router.post("/status", response_model=QueueTicket)
def update_ticket_status(req: UpdateTicketStatusRequest):
    t = queue_service.update_status(req.ticket_id, req.new_status)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t

@router.get("/ticket/{ticket_id}", response_model=QueueTicket)
def get_single_ticket(ticket_id: str):
    t = queue_service.get_ticket(ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t
