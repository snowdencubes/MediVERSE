"""
Session Event Logger
Tracks button clicks, page navigation, and form inputs with session IDs.
Writes to Supabase session_events table when connected, otherwise to a local CSV.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Any, List
import csv
import os
import json
import datetime

router = APIRouter(prefix="/session", tags=["Session Tracking"])

# Local fallback file
_SESSION_CSV = os.path.join(os.getcwd(), "data", "database", "session_events.csv")
_CSV_HEADERS = ["ts", "session_id", "event_type", "page", "element", "value", "extra"]

def _ensure_csv():
    os.makedirs(os.path.dirname(_SESSION_CSV), exist_ok=True)
    if not os.path.exists(_SESSION_CSV):
        with open(_SESSION_CSV, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(_CSV_HEADERS)

def _write_csv(row: dict):
    _ensure_csv()
    with open(_SESSION_CSV, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=_CSV_HEADERS, extrasaction="ignore")
        w.writerow(row)

def _try_supabase(row: dict) -> bool:
    """Attempt to write to Supabase session_events table. Returns True on success."""
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_KEY", "")
        if not url or not key:
            return False
        client = create_client(url, key)
        client.table("session_events").insert({
            "ts":         row["ts"],
            "session_id": row["session_id"],
            "event_type": row["event_type"],
            "page":       row.get("page", ""),
            "element":    row.get("element", ""),
            "value":      row.get("value", ""),
            "extra":      row.get("extra", ""),
        }).execute()
        return True
    except Exception:
        return False


class SessionEvent(BaseModel):
    session_id: str
    event_type: str          # "click" | "navigate" | "input" | "submit" | "voice"
    page: Optional[str] = None
    element: Optional[str] = None   # button label or input field name
    value: Optional[str] = None     # what was typed or selected
    extra: Optional[Any] = None     # any additional JSON-serialisable data


class SessionEventResponse(BaseModel):
    status: str
    verified_supabase: bool
    ts: str


@router.post("/event", response_model=SessionEventResponse)
def log_session_event(evt: SessionEvent):
    """Log a user interaction event. Returns Supabase verification status."""
    ts = datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z"
    extra_str = json.dumps(evt.extra) if evt.extra else ""
    row = {
        "ts":         ts,
        "session_id": evt.session_id,
        "event_type": evt.event_type,
        "page":       evt.page or "",
        "element":    evt.element or "",
        "value":      evt.value or "",
        "extra":      extra_str,
    }

    # Always write to local CSV
    _write_csv(row)

    # Attempt Supabase write
    verified = _try_supabase(row)

    # Print structured terminal log
    supabase_tag = "[SUPABASE OK]" if verified else "[LOCAL ONLY]"
    print(f"\n[SESSION] {supabase_tag} session={evt.session_id}")
    print(f"  event  : {evt.event_type}")
    print(f"  page   : {evt.page or '-'}")
    print(f"  element: {evt.element or '-'}")
    if evt.value:
        print(f"  value  : {evt.value}")
    if evt.extra:
        print(f"  extra  : {extra_str[:120]}")
    print(f"  ts     : {ts}")
    print("-" * 60)

    return SessionEventResponse(status="ok", verified_supabase=verified, ts=ts)


class SessionHistoryResponse(BaseModel):
    session_id: str
    events: List[dict]
    total: int
    supabase_source: bool


@router.get("/{session_id}", response_model=SessionHistoryResponse)
def get_session_history(session_id: str):
    """Retrieve all events for a session from Supabase (if connected) or local CSV."""
    # Try Supabase first
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_KEY", "")
        if url and key:
            client = create_client(url, key)
            res = client.table("session_events").select("*").eq("session_id", session_id).order("ts").execute()
            if res.data:
                return SessionHistoryResponse(
                    session_id=session_id,
                    events=res.data,
                    total=len(res.data),
                    supabase_source=True,
                )
    except Exception:
        pass

    # Fallback: local CSV
    events = []
    _ensure_csv()
    try:
        with open(_SESSION_CSV, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row.get("session_id") == session_id:
                    events.append(row)
    except Exception:
        pass

    return SessionHistoryResponse(
        session_id=session_id,
        events=events,
        total=len(events),
        supabase_source=False,
    )
