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

load_dotenv()
load_dotenv(os.path.join(ROOT_DIR, ".env"))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))

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
    pri_map = {"EMERGENCY": 3, "URGENT": 2, "STANDARD": 1}
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
                pri_int = pri_map.get(str(record.priority_level).upper(), 1)
                payload = {
                    "ticket_id": record.ticket_id,
                    "token_number": record.token_number,
                    "department_id": record.department_id,
                    "doctor_id": record.doctor_id,
                    "patient_name": record.patient_name,
                    "patient_phone": record.patient_phone,
                    "status": record.status,
                    "priority_level": pri_int,
                    "triage_score": record.triage_score or 1,
                    "total_fee": float(record.total_fee or 0.0),
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
                        err_str = str(e)
                        # If foreign key violation on department_id or doctor_id, retry without them
                        if "foreign key constraint" in err_str or "23503" in err_str:
                            try:
                                safe_payload = dict(payload)
                                safe_payload["department_id"] = None
                                safe_payload["doctor_id"] = None
                                client.table('tickets').upsert(safe_payload, on_conflict='ticket_id').execute()
                                record.synced = True
                                db.add(record)
                            except Exception as err2:
                                print(f"[Supabase Sync] Retry failed for {record.ticket_id}: {err2}")
                        else:
                            print(f"[Supabase Sync] Upsert failed for {record.ticket_id}: {e}")
                else:
                    record.synced = True
                    db.add(record)
                    
            db.commit()
            db.close()
        except Exception as ex:
            print(f"[Supabase Sync] Unexpected error: {ex}")
            
        time.sleep(30)

def start_sync_service():
    """Start the background sync thread."""
    t = threading.Thread(target=sync_worker, daemon=True)
    t.start()
