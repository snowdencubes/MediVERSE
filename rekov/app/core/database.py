import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import json

# Ensure data directories exist
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA_DIR = os.path.join(ROOT_DIR, "data", "database")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "local.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class TicketModel(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String, unique=True, index=True)
    token_number = Column(String, index=True)
    department_id = Column(String)
    department_name = Column(String)
    doctor_id = Column(String, nullable=True)
    doctor_name = Column(String)
    room_number = Column(String)
    patient_name = Column(String)
    patient_phone = Column(String, nullable=True)
    status = Column(String, default="WAITING") # WAITING, IN_CONSULTATION, COMPLETED, CANCELLED
    priority_level = Column(String, default="STANDARD")
    triage_score = Column(Integer, default=1)
    combos_selected = Column(String, default="[]") # JSON string
    total_fee = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    estimated_call_time = Column(String)
    synced = Column(Boolean, default=False) # For offline -> Supabase sync

class WhatsappSession(Base):
    __tablename__ = "whatsapp_sessions"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, index=True)
    status = Column(String, default="pending") # pending, consumed
    created_at = Column(DateTime, default=datetime.utcnow)

class DoctorCredentials(Base):
    __tablename__ = "doctor_credentials"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(String, unique=True, index=True)
    username = Column(String)
    password_hash = Column(String)
    role = Column(String, default="doctor")
    created_at = Column(DateTime, default=datetime.utcnow)


def _hash_password(password: str) -> str:
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()


def seed_doctors(db):
    """Seed default doctor credentials if table is empty."""
    existing = db.query(DoctorCredentials).first()
    if existing:
        return

    defaults = [
        {"doctor_id": "doc_1", "username": "dr.vance", "password": "rekov123"},
        {"doctor_id": "doc_2", "username": "dr.rostova", "password": "rekov123"},
        {"doctor_id": "doc_3", "username": "dr.thorne", "password": "rekov123"},
        {"doctor_id": "doc_4", "username": "dr.jenkins", "password": "rekov123"},
    ]

    for d in defaults:
        cred = DoctorCredentials(
            doctor_id=d["doctor_id"],
            username=d["username"],
            password_hash=_hash_password(d["password"]),
        )
        db.add(cred)
    db.commit()


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_doctors(db)
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
