import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import json

# Canonical database directory: always rekov/data/database
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.getenv("DATA_DIR") or os.path.join(BACKEND_DIR, "data", "database")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "local.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

from datetime import datetime, timedelta

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
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(hours=24))
    estimated_call_time = Column(String)
    synced = Column(Boolean, default=False) # For offline -> Supabase sync
    receipt_pdf_url = Column(String, nullable=True) # Public URL to Supabase PDF receipt

class WhatsappSession(Base):
    __tablename__ = "whatsapp_sessions"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, index=True)
    status = Column(String, default="pending") # pending, consumed
    created_at = Column(DateTime, default=datetime.utcnow)

class BotSession(Base):
    __tablename__ = "bot_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    platform = Column(String)  # 'telegram' or 'whatsapp'
    chat_id = Column(String, index=True)
    state = Column(String, default="{}")  # JSON encoded state dict
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DoctorCredentials(Base):
    __tablename__ = "doctor_credentials"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(String, unique=True, index=True)
    username = Column(String)
    password_hash = Column(String)
    role = Column(String, default="doctor")
    created_at = Column(DateTime, default=datetime.utcnow)


class MobileSession(Base):
    """Pairs a kiosk session to a phone-submitted form via rotating QR code."""
    __tablename__ = "mobile_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)   # UUID shown in QR
    status = Column(String, default="PENDING")              # PENDING | SUBMITTED | EXPIRED
    patient_name = Column(String, nullable=True)
    patient_phone = Column(String, nullable=True)
    patient_dob = Column(String, nullable=True)
    department_id = Column(String, nullable=True)
    chief_complaint = Column(String, nullable=True)
    documents = Column(String, default="[]")               # JSON list of {name, url, type}
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(seconds=30))


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
    from sqlalchemy import inspect, text
    try:
        inspector = inspect(engine)
        if "tickets" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("tickets")]
            with engine.connect() as conn:
                if "patient_phone" not in columns:
                    conn.execute(text("ALTER TABLE tickets ADD COLUMN patient_phone VARCHAR"))
                if "expires_at" not in columns:
                    conn.execute(text("ALTER TABLE tickets ADD COLUMN expires_at DATETIME"))
                if "receipt_pdf_url" not in columns:
                    conn.execute(text("ALTER TABLE tickets ADD COLUMN receipt_pdf_url VARCHAR"))
                conn.commit()
            
            # Clean up expired receipts older than 24 hours
            now_iso = datetime.utcnow().isoformat()
            with engine.connect() as conn:
                conn.execute(text("DELETE FROM tickets WHERE expires_at IS NOT NULL AND expires_at < :now"), {"now": now_iso})
                conn.commit()
    except Exception as e:
        print(f"Migration check warning: {e}")

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

def purge_stale_sessions(max_age_hours: int = 24):
    """Purges BotSession rows that haven't been updated in max_age_hours."""
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
        db.query(BotSession).filter(BotSession.updated_at < cutoff).delete()
        db.commit()
    except Exception as e:
        print(f"Failed to purge stale sessions: {e}")
    finally:
        db.close()

# Auto-initialize and migrate schema on module import
try:
    init_db()
except Exception as e:
    print(f"Auto init_db warning: {e}")
