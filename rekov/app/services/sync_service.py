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

from app.core.config import settings

SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY

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

def _map_priority_level(val) -> int:
    if isinstance(val, int):
        return val
    s = str(val).upper()
    if s == "EMERGENCY" or s == "3":
        return 3
    elif s == "URGENT" or s == "2":
        return 2
    return 1

def _get_supabase_config():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not (url and key):
        for cfg_path in [os.path.join(ROOT_DIR, "config.json"), os.path.join(ROOT_DIR, "rekov", "config.json")]:
            if os.path.isfile(cfg_path):
                try:
                    with open(cfg_path, "r", encoding="utf-8") as f:
                        cfg_data = json.load(f)
                        sb = cfg_data.get("supabase", {}) if isinstance(cfg_data.get("supabase"), dict) else {}
                        url = url or sb.get("url") or cfg_data.get("SUPABASE_URL")
                        key = key or sb.get("key") or cfg_data.get("SUPABASE_KEY")
                        if url and key:
                            os.environ["SUPABASE_URL"] = url
                            os.environ["SUPABASE_KEY"] = key
                            break
                except Exception:
                    pass
    return url, key

def sync_worker():
    """Background thread that runs every 30s to sync unsynced records to Supabase when connected to internet."""
    while True:
        try:
            url, key = _get_supabase_config()
            
            client = None
            if url and key:
                try:
                    client = create_client(url, key)
                except Exception:
                    client = None

            db = SessionLocal()
            unsynced = db.query(TicketModel).filter(TicketModel.synced == False).all()
            
            if unsynced:
                print(f"[SUPABASE] SYNC START  {len(unsynced)} unsynced ticket(s)")

            for record in unsynced:
                # Use environment config url instead of hardcoded
                pdf_url = record.receipt_pdf_url
                if not pdf_url and url:
                    pdf_url = f"{url}/storage/v1/object/public/receipts/user/{record.ticket_id}_user.pdf"
                
                payload = {
                    "ticket_id": record.ticket_id,
                    "token_number": record.token_number,
                    "department_id": record.department_id,
                    "doctor_id": record.doctor_id,
                    "patient_name": record.patient_name,
                    "patient_phone": record.patient_phone,
                    "status": record.status,
                    "priority_level": _map_priority_level(record.priority_level),
                    "triage_score": record.triage_score or 1,
                    "total_fee": float(record.total_fee or 0.0),
                    "receipt_pdf_url": pdf_url or "",
                    "created_at": record.created_at.isoformat() if record.created_at else ""
                }
                
                # Always create local offline backup
                _backup_locally(payload)
                
                # Attempt Supabase sync if connected to internet
                if client:
                    try:
                        client.table('tickets').upsert(payload, on_conflict='ticket_id').execute()
                        record.synced = True
                        db.add(record)
                        print(f"[SUPABASE] PUSH OK     {record.token_number} | {record.patient_name}")
                    except Exception as e:
                        err_str = str(e)
                        # Fallback: remove unknown columns (like receipt_pdf_url or FKs) and retry
                        try:
                            safe_payload = dict(payload)
                            safe_payload.pop("receipt_pdf_url", None)
                            if "foreign key constraint" in err_str or "23503" in err_str:
                                safe_payload["department_id"] = None
                                safe_payload["doctor_id"] = None
                            client.table('tickets').upsert(safe_payload, on_conflict='ticket_id').execute()
                            record.synced = True
                            db.add(record)
                            print(f"[SUPABASE] PUSH OK(FB) {record.token_number} | {record.patient_name}")
                        except Exception as err2:
                            print(f"[SUPABASE] PUSH FAIL   {record.ticket_id}: {err2}")
                else:
                    # No internet — do NOT mark synced locally so it retries next time
                    print(f"[SUPABASE] OFFLINE     {record.token_number} saved locally only, will retry")
                    
            db.commit()
            db.close()
        except Exception as ex:
            print(f"[SUPABASE] SYNC ERROR  {ex}")
            
        time.sleep(30)

def run_sync_cycle() -> dict:
    """Forces an immediate sync cycle and offline JSON backup."""
    url, key = _get_supabase_config()
    
    client = None
    if url and key:
        try:
            client = create_client(url, key)
        except Exception:
            client = None

    db = SessionLocal()
    unsynced = db.query(TicketModel).filter(TicketModel.synced == False).all()
    all_tickets = db.query(TicketModel).all()
    
    # Ensure all existing tickets have local offline backup JSON
    for record in all_tickets:
        _backup_locally({
            "ticket_id": record.ticket_id,
            "token_number": record.token_number,
            "department_id": record.department_id,
            "doctor_id": record.doctor_id,
            "patient_name": record.patient_name,
            "patient_phone": record.patient_phone,
            "status": record.status,
            "priority_level": _map_priority_level(record.priority_level),
            "triage_score": record.triage_score or 1,
            "total_fee": float(record.total_fee or 0.0),
            "created_at": record.created_at.isoformat() if record.created_at else ""
        })

    synced_in_this_run = 0
    for record in unsynced:
        pdf_url = record.receipt_pdf_url
        if not pdf_url and url:
            pdf_url = f"{url}/storage/v1/object/public/receipts/user/{record.ticket_id}_user.pdf"
            
        payload = {
            "ticket_id": record.ticket_id,
            "token_number": record.token_number,
            "department_id": record.department_id,
            "doctor_id": record.doctor_id,
            "patient_name": record.patient_name,
            "patient_phone": record.patient_phone,
            "status": record.status,
            "priority_level": _map_priority_level(record.priority_level),
            "triage_score": record.triage_score or 1,
            "total_fee": float(record.total_fee or 0.0),
            "receipt_pdf_url": pdf_url or "",
            "created_at": record.created_at.isoformat() if record.created_at else ""
        }
        
        if client:
            try:
                client.table('tickets').upsert(payload, on_conflict='ticket_id').execute()
                record.synced = True
                db.add(record)
                synced_in_this_run += 1
            except Exception as e:
                err_str = str(e)
                try:
                    safe_payload = dict(payload)
                    safe_payload.pop("receipt_pdf_url", None)
                    if "foreign key constraint" in err_str or "23503" in err_str:
                        safe_payload["department_id"] = None
                        safe_payload["doctor_id"] = None
                    client.table('tickets').upsert(safe_payload, on_conflict='ticket_id').execute()
                    record.synced = True
                    db.add(record)
                    synced_in_this_run += 1
                except Exception:
                    pass
        else:
            # Keep unsynced if we couldn't connect
            pass

    db.commit()
    db.close()

    backup_count = len([f for f in os.listdir(BACKUP_DIR) if f.endswith(".json")]) if os.path.exists(BACKUP_DIR) else 0

    return {
        "status": "success",
        "synced_in_run": synced_in_this_run,
        "supabase_connected": bool(client),
        "total_offline_backups": backup_count
    }

def get_sync_status() -> dict:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase_configured = bool(url and key)

    backup_count = len([f for f in os.listdir(BACKUP_DIR) if f.endswith(".json")]) if os.path.exists(BACKUP_DIR) else 0
    
    db = SessionLocal()
    total_local = db.query(TicketModel).count()
    unsynced_count = db.query(TicketModel).filter(TicketModel.synced == False).count()
    synced_count = db.query(TicketModel).filter(TicketModel.synced == True).count()
    
    # Also fetch recent 20 tickets for reception dashboard display
    recent_records = db.query(TicketModel).order_by(TicketModel.id.desc()).limit(20).all()
    recent_list = [
        {
            "ticket_id": r.ticket_id,
            "token_number": r.token_number,
            "patient_name": r.patient_name,
            "patient_phone": r.patient_phone,
            "department_id": r.department_id,
            "doctor_id": r.doctor_id,
            "status": r.status,
            "priority_level": r.priority_level,
            "synced": r.synced,
            "created_at": r.created_at.isoformat() if r.created_at else ""
        }
        for r in recent_records
    ]
    db.close()

    return {
        "supabase_configured": supabase_configured,
        "supabase_connected": supabase_configured,
        "total_tickets": total_local,
        "synced_count": synced_count,
        "unsynced_count": unsynced_count,
        "offline_backups_count": backup_count,
        "backup_directory": BACKUP_DIR,
        "recent_tickets": recent_list
    }

def start_sync_service():
    """Start the background sync thread."""
    t = threading.Thread(target=sync_worker, daemon=True)
    t.start()
