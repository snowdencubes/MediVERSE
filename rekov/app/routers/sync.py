from fastapi import APIRouter
from app.services.sync_service import get_sync_status, run_sync_cycle

router = APIRouter(prefix="/sync", tags=["Supabase & Offline Sync"])

@router.get("/status")
def sync_status():
    """Returns current Supabase connection status, synced record count, and local offline backups."""
    return get_sync_status()

@router.post("/trigger")
def trigger_sync():
    """Forces an immediate synchronization cycle to Supabase and saves offline JSON backup files."""
    return run_sync_cycle()
