import os
import time
import json
import threading
from dotenv import load_dotenv
from supabase import create_client, Client
from app.core.database import SessionLocal, TicketModel

# Go up from rekov/app/services to find root
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
BACKUP_DIR = os.path.join(ROOT_DIR, "data", "backup_offline")
os.makedirs(BACKUP_DIR, exist_ok=True)

load_dotenv(os.path.join(ROOT_DIR, ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")

def _backup_locally(ticket: dict):
    """Save an offline backup JSON."""
    backup_file = os.path.join(BACKUP_DIR, f"{ticket['ticket_id']}.json")
    with open(backup_file, "w") as f:
        json.dump(ticket, f)

def sync_worker():
    """Background thread that runs every 30s to sync unsynced records to Supabase when connected to internet."""
    while True:
        try:
            url = os.environ.get("SUPABASE_URL")
            key = os.environ.get("SUPABASE_KEY")
            
            client = None
            if url and key:
                try:
                    client = create_client(url, key)
                except Exception:
                    client = None

            db = SessionLocal()
            unsynced = db.query(TicketModel).filter(TicketModel.synced == False).all()
            
            for record in unsynced:
                payload = {
                    "ticket_id": record.ticket_id,
                    "token_number": record.token_number,
                    "department_id": record.department_id,
                    "patient_name": record.patient_name,
                    "status": record.status,
                    "priority_level": record.priority_level,
                    "triage_score": record.triage_score,
                    "total_fee": record.total_fee,
                    "created_at": record.created_at.isoformat()
                }
                
                # Always create local offline backup
                _backup_locally(payload)
                
                # Attempt Supabase sync if connected to internet
                if client:
                    try:
                        client.table('tickets').upsert(payload, on_conflict='ticket_id').execute()
                        record.synced = True
                        db.add(record)
                    except Exception as e:
                        # Offline / Network failure: retain synced=False to retry next 30s cycle
                        pass
                else:
                    record.synced = True
                    db.add(record)
                    
            db.commit()
            db.close()
        except Exception:
            pass
            
        time.sleep(30)

def start_sync_service():
    """Start the background sync thread."""
    t = threading.Thread(target=sync_worker, daemon=True)
    t.start()
