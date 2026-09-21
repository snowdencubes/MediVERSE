from typing import List, Optional, Dict
from datetime import datetime
import uuid
import json

from app.schemas.kiosk_schemas import (
    Department, Doctor, Receptionist, HealthComboPackage, VitalsInput,
    PatientRegistration, QueueTicket, TicketCreateRequest, QueueBoardResponse
)
from app.core.database import SessionLocal, TicketModel

import csv
import os
import threading
from app.services.pdf_service import generate_receipts
from app.services.storage_service import upload_receipt

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "database")

class QueueService:
    def __init__(self):
        self.departments: Dict[str, Department] = {}
        self.doctors: Dict[str, Doctor] = {}
        self.receptionists: Dict[str, Receptionist] = {}
        self.health_combos: Dict[str, HealthComboPackage] = {}
        self.counters: Dict[str, int] = {"GEN": 100, "CARD": 100, "PED": 100, "ORTH": 100, "RX": 100, "EMG": 900}
        
        self._load_csv_data()

    def _load_csv_data(self):
        # Load Departments
        dept_file = os.path.join(DATA_DIR, "departments.csv")
        if os.path.exists(dept_file):
            with open(dept_file, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.departments[row["id"]] = Department(
                        id=row["id"], name=row["name"], code=row["code"], description=row["description"],
                        active_doctors_count=int(row.get("active_doctors_count", 0)),
                        wait_time_minutes=int(row.get("wait_time_minutes", 0))
                    )
        
        # Load Doctors
        doc_file = os.path.join(DATA_DIR, "doctors.csv")
        if os.path.exists(doc_file):
            with open(doc_file, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.doctors[row["id"]] = Doctor(
                        id=row["id"], name=row["name"], department_id=row["department_id"],
                        specialty=row["specialty"], room_number=row["room_number"],
                        is_available=row.get("is_available", "True") == "True",
                        estimated_wait_minutes=int(row.get("estimated_wait_minutes", 0)),
                        consultation_fee=float(row.get("consultation_fee", 0.0)),
                        rating=float(row.get("rating", 0.0)), experience_years=int(row.get("experience_years", 0)),
                        arrival_time=row.get("arrival_time") or None,
                        pin=row.get("pin") or None,
                        shift_schedule=row.get("shift_schedule") or None
                    )
                    
        # Load Receptionists
        rec_file = os.path.join(DATA_DIR, "receptionists.csv")
        if os.path.exists(rec_file):
            with open(rec_file, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.receptionists[row["id"]] = Receptionist(
                        id=row["id"], name=row["name"], pin=row["pin"]
                    )
                    
        # Load Combos
        cmb_file = os.path.join(DATA_DIR, "combos.csv")
        if os.path.exists(cmb_file):
            with open(cmb_file, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    inc_tests = [t.strip() for t in row.get("included_tests", "").split(";") if t.strip()]
                    self.health_combos[row["id"]] = HealthComboPackage(
                        id=row["id"], title=row["title"], category=row["category"],
                        description=row["description"], included_tests=inc_tests,
                        price=float(row.get("price", 0.0)), priority_bump=int(row.get("priority_bump", 0))
                    )

    def _save_csv_data(self):
        # Save Departments
        with open(os.path.join(DATA_DIR, "departments.csv"), mode="w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "name", "code", "description", "active_doctors_count", "wait_time_minutes"])
            for d in self.departments.values():
                writer.writerow([d.id, d.name, d.code, d.description, d.active_doctors_count, d.wait_time_minutes])
        
        # Save Doctors
        with open(os.path.join(DATA_DIR, "doctors.csv"), mode="w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "name", "department_id", "specialty", "room_number", "is_available", "estimated_wait_minutes", "consultation_fee", "rating", "experience_years", "arrival_time", "pin", "shift_schedule"])
            for d in self.doctors.values():
                writer.writerow([d.id, d.name, d.department_id, d.specialty, d.room_number, str(d.is_available), d.estimated_wait_minutes, d.consultation_fee, d.rating, d.experience_years, d.arrival_time or "", d.pin or "", d.shift_schedule or ""])
                
        # Save Receptionists
        with open(os.path.join(DATA_DIR, "receptionists.csv"), mode="w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "name", "pin"])
            for r in self.receptionists.values():
                writer.writerow([r.id, r.name, r.pin])
                
        # Save Combos
        with open(os.path.join(DATA_DIR, "combos.csv"), mode="w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "title", "category", "description", "included_tests", "price", "priority_bump"])
            for c in self.health_combos.values():
                writer.writerow([c.id, c.title, c.category, c.description, ";".join(c.included_tests), c.price, c.priority_bump])

    def reload_data(self):
        self._load_csv_data()
        
    def save_data(self):
        self._save_csv_data()

    def _model_to_schema(self, m: TicketModel) -> QueueTicket:
        return QueueTicket(
            ticket_id=m.ticket_id,
            token_number=m.token_number,
            department_id=m.department_id,
            department_name=m.department_name,
            doctor_id=m.doctor_id,
            doctor_name=m.doctor_name,
            room_number=m.room_number,
            patient_name=m.patient_name,
            patient_phone=m.patient_phone,
            status=m.status,
            priority_level=m.priority_level,
            triage_score=m.triage_score,
            combos_selected=json.loads(m.combos_selected),
            total_fee=m.total_fee,
            created_at=m.created_at.strftime("%H:%M:%S"),
            estimated_call_time=m.estimated_call_time
        )

    def calculate_triage(self, vitals: Optional[VitalsInput]) -> tuple[str, int]:
        if not vitals:
            return ("STANDARD", 1)
        score = 1
        if vitals.systolic_bp >= 160 or vitals.diastolic_bp >= 100: score += 4
        elif vitals.systolic_bp >= 140 or vitals.diastolic_bp >= 90: score += 2
        if vitals.heart_rate >= 110 or vitals.heart_rate <= 50: score += 3
        if vitals.temperature_c >= 38.5: score += 3
        if vitals.pain_score >= 8: score += 5
        elif vitals.pain_score >= 5: score += 2

        if score >= 7: return ("EMERGENCY", score)
        elif score >= 4: return ("URGENT", score)
        return ("STANDARD", score)

    def create_ticket(self, req: TicketCreateRequest) -> QueueTicket:
        dep = self.departments.get(req.department_id, self.departments["dep_gen"])
        code = dep.code
        
        # Simple counter logic for now
        self.counters[code] += 1
        token_num = f"{code}-{self.counters[code]}"

        doctor = self.doctors.get(req.doctor_id) if req.doctor_id else None
        doc_name = doctor.name if doctor else "Duty Specialist"
        room_num = doctor.room_number if doctor else "Desk A"

        base_fee = doctor.consultation_fee if doctor else 35.0
        combo_titles = []
        combo_fee = 0.0
        for cid in req.combo_package_ids:
            if cid in self.health_combos:
                cb = self.health_combos[cid]
                combo_titles.append(cb.title)
                combo_fee += cb.price

        total_fee = base_fee + combo_fee
        if req.patient.insurance_member:
            total_fee = round(total_fee * 0.2, 2)

        priority_lvl, triage_sc = self.calculate_triage(req.vitals)

        ticket_id = f"tck-{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow()

        db = SessionLocal()
        try:
            db_ticket = TicketModel(
                ticket_id=ticket_id,
                token_number=token_num,
                department_id=dep.id,
                department_name=dep.name,
                doctor_id=doctor.id if doctor else None,
                doctor_name=doc_name,
                room_number=room_num,
                patient_name=req.patient.full_name,
                patient_phone=req.patient.phone,
                status="WAITING",
                priority_level=priority_lvl,
                triage_score=triage_sc,
                combos_selected=json.dumps(combo_titles),
                total_fee=total_fee,
                estimated_call_time="~5-10 mins",
                synced=False
            )
            db.add(db_ticket)
            db.commit()
            db.refresh(db_ticket)

            # Append to receipts.csv for flat-file tracking
            self._append_receipt(
                ticket_id=ticket_id,
                token_number=token_num,
                patient_name=req.patient.full_name,
                patient_phone=req.patient.phone or "",
                department=dep.name,
                doctor=doc_name,
                room=room_num,
                total_fee=total_fee,
                priority=priority_lvl,
                triage_score=triage_sc,
                combos="; ".join(combo_titles),
                created_at=now.strftime("%Y-%m-%d %H:%M:%S")
            )

            t = self._model_to_schema(db_ticket)

            # Fire and forget PDF Generation + Supabase Upload
            def _process_receipts(tck: QueueTicket):
                try:
                    user_path, our_path = generate_receipts(tck)
                    upload_receipt(user_path, "receipts", f"user/{tck.ticket_id}_user.pdf")
                    upload_receipt(our_path, "receipts", f"our/{tck.ticket_id}_our.pdf")
                except Exception as e:
                    print(f"Receipt processing failed: {e}")

            threading.Thread(target=_process_receipts, args=(t,), daemon=True).start()

            return t
        finally:
            db.close()

    def _append_receipt(self, **row):
        """Append a single receipt row to receipts.csv, creating the file with headers if needed."""
        receipt_file = os.path.join(DATA_DIR, "receipts.csv")
        file_exists = os.path.exists(receipt_file)
        fieldnames = [
            "ticket_id", "token_number", "patient_name", "patient_phone",
            "department", "doctor", "room", "total_fee", "priority",
            "triage_score", "combos", "created_at"
        ]
        with open(receipt_file, mode="a", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()
            writer.writerow(row)

    def get_queue_board(self) -> QueueBoardResponse:
        db = SessionLocal()
        try:
            tickets = db.query(TicketModel).all()
            
            waiting = [t for t in tickets if t.status == "WAITING"]
            # Sort waiting by triage score (descending)
            waiting.sort(key=lambda t: (-t.triage_score, t.id))
            
            now_calling = [t for t in tickets if t.status == "NOW_CALLING"]
            now_call = self._model_to_schema(now_calling[0]) if now_calling else None

            recently_called = [self._model_to_schema(t) for t in tickets if t.status == "IN_CONSULTATION"]
            recently_called.sort(key=lambda t: t.created_at, reverse=True)

            completed = [t for t in tickets if t.status == "COMPLETED"]

            return QueueBoardResponse(
                now_calling=now_call,
                recently_called=recently_called[:4],
                waiting_queue=[self._model_to_schema(t) for t in waiting],
                completed_today=len(completed) + 14, # simulate some prior ones
                average_wait_minutes=6
            )
        finally:
            db.close()

    def call_next(self, doctor_id: Optional[str] = None, room_number: Optional[str] = None) -> Optional[QueueTicket]:
        db = SessionLocal()
        try:
            # Demote current NOW_CALLING
            current = db.query(TicketModel).filter(TicketModel.status == "NOW_CALLING").first()
            if current:
                current.status = "IN_CONSULTATION"
                current.synced = False
                db.add(current)

            # Get next waiting
            waiting = db.query(TicketModel).filter(TicketModel.status == "WAITING").all()
            if doctor_id:
                doc = self.doctors.get(doctor_id)
                if doc:
                    matching = [t for t in waiting if t.doctor_id == doctor_id or t.department_id == doc.department_id]
                    if matching:
                        waiting = matching

            if not waiting:
                db.commit()
                return None

            waiting.sort(key=lambda t: (-t.triage_score, t.id))
            top_ticket = waiting[0]
            
            top_ticket.status = "NOW_CALLING"
            if room_number:
                top_ticket.room_number = room_number
            top_ticket.synced = False
                
            db.add(top_ticket)
            db.commit()
            db.refresh(top_ticket)
            return self._model_to_schema(top_ticket)
        finally:
            db.close()

    def get_ticket(self, ticket_id: str) -> Optional[QueueTicket]:
        db = SessionLocal()
        try:
            q = ticket_id.strip()
            t = db.query(TicketModel).filter(TicketModel.ticket_id.ilike(q)).first()
            if not t:
                t = db.query(TicketModel).filter(TicketModel.token_number.ilike(q)).first()
            if not t:
                # Search by phone number (strip spaces or special chars)
                clean_phone = "".join(filter(str.isdigit, q))
                if clean_phone and len(clean_phone) >= 4:
                    t = db.query(TicketModel).filter(TicketModel.patient_phone.like(f"%{clean_phone}%")).order_by(TicketModel.id.desc()).first()
            if t:
                return self._model_to_schema(t)
            return None
        finally:
            db.close()

    def notify_upcoming(self, ticket_id: str) -> Dict[str, str]:
        t = self.get_ticket(ticket_id)
        if not t:
            return {"status": "error", "message": "Ticket not found"}
        phone = t.patient_phone or "Registered Number"
        msg = f"Your turn is upcoming in 5 minutes! Token {t.token_number}, Patient {t.patient_name}, Room {t.room_number}, Dr. {t.doctor_name}."
        return {
            "status": "sent",
            "phone": phone,
            "token_number": t.token_number,
            "message": msg
        }

    def update_status(self, ticket_id: str, new_status: str) -> Optional[QueueTicket]:
        db = SessionLocal()
        try:
            t = db.query(TicketModel).filter(TicketModel.ticket_id == ticket_id).first()
            if not t:
                t = db.query(TicketModel).filter(TicketModel.token_number == ticket_id).first()
            if t:
                t.status = new_status
                t.synced = False
                db.add(t)
                db.commit()
                db.refresh(t)
                return self._model_to_schema(t)
            return None
        finally:
            db.close()

queue_service = QueueService()
