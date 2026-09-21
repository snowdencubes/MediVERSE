"""
BackupVerifier — Bi-directional Supabase <-> Local CSV/SQLite verifier.

Logic:
  1. On startup: detect if Supabase tables are empty. If so, seed from CSVs.
  2. Every 30s: compare local CSV file mod-time hash vs Supabase record count/timestamps.
     - If offline changes found in CSV  -> push to Supabase (CSV is source of truth when offline).
     - If Supabase has newer/extra rows -> pull back and update local CSV backup files.
  3. Tickets in local.db that are unsynced -> push to Supabase tickets table.
"""

import os
import csv
import json
import hashlib
import logging
import socket
import time
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv

# ── Logger ──────────────────────────────────────────────────────────────────
logger = logging.getLogger("backupverifier")
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter(
        "%(asctime)s [BackupVerifier] %(levelname)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    ))
    logger.addHandler(_handler)
logger.setLevel(logging.INFO)

# ── Paths ────────────────────────────────────────────────────────────────────
_THIS_FILE = os.path.abspath(__file__)
# rekov/app/services/backupverifier/verifier.py  ->  root is 5 levels up
ROOT_DIR = os.path.dirname(  # rekov root
    os.path.dirname(          # rekov/
        os.path.dirname(      # rekov/app/
            os.path.dirname(  # rekov/app/services/
                os.path.dirname(_THIS_FILE)  # rekov/app/services/backupverifier/
            )
        )
    )
)
DATA_DIR = os.path.join(ROOT_DIR, "data", "database")
BACKUP_DIR = os.path.join(ROOT_DIR, "data", "backup_offline")
STATE_FILE = os.path.join(ROOT_DIR, "data", "backupverifier_state.json")

os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# ── CSV table -> Supabase table mapping ─────────────────────────────────────
CSV_TABLE_MAP = {
    "doctors.csv":       "doctors",
    "departments.csv":   "departments",
    "combos.csv":        "combos",
    "patients.csv":      "patients",
    "schedules.csv":     "schedules",
}

# ── Load env ─────────────────────────────────────────────────────────────────
load_dotenv()
load_dotenv(os.path.join(ROOT_DIR, ".env"))
load_dotenv(os.path.join(ROOT_DIR, "rekov", ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_online() -> bool:
    """Quick TCP check to see if we can reach Supabase's host."""
    try:
        if not SUPABASE_URL:
            return False
        host = SUPABASE_URL.replace("https://", "").replace("http://", "").split("/")[0]
        socket.setdefaulttimeout(3)
        socket.create_connection((host, 443))
        return True
    except Exception:
        return False


def _get_supabase_client():
    """Return a Supabase client or None if not configured / offline."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        from supabase import create_client
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        logger.warning(f"Supabase client init failed: {e}")
        return None


def _csv_file_hash(path: str) -> str:
    """MD5 of the full CSV file content — changes whenever any row is edited."""
    try:
        with open(path, "rb") as f:
            return hashlib.md5(f.read()).hexdigest()
    except Exception:
        return ""


def _load_state() -> dict:
    """Load persisted verifier state (last known CSV hashes, last sync time)."""
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_state(state: dict):
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        logger.warning(f"Could not save state: {e}")


def _read_csv(csv_path: str) -> list[dict]:
    rows = []
    try:
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Remove empty-value keys
                rows.append({k: v for k, v in row.items() if k})
    except Exception as e:
        logger.warning(f"Could not read {csv_path}: {e}")
    return rows


def _write_csv(csv_path: str, rows: list[dict], fieldnames: Optional[list] = None):
    if not rows:
        return
    try:
        headers = fieldnames or list(rows[0].keys())
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
        logger.info(f"Updated local CSV: {os.path.basename(csv_path)} ({len(rows)} rows)")
    except Exception as e:
        logger.error(f"Failed to write {csv_path}: {e}")


# ── Core Verifier ─────────────────────────────────────────────────────────────

class BackupVerifier:
    def __init__(self):
        self.state = _load_state()

    # ── 1. Seed empty Supabase tables from CSV ─────────────────────────────
    def _seed_if_empty(self, client, csv_file: str, table: str):
        csv_path = os.path.join(DATA_DIR, csv_file)
        if not os.path.exists(csv_path):
            return

        rows = _read_csv(csv_path)
        if not rows:
            return

        try:
            result = client.table(table).select("id", count="exact").limit(1).execute()
            count = result.count if result.count is not None else len(result.data or [])
        except Exception as e:
            logger.warning(f"[{table}] Could not check row count: {e}")
            return

        if count == 0:
            logger.info(f"[{table}] Supabase is empty — seeding {len(rows)} rows from {csv_file}")
            try:
                # Upsert in batches of 100
                for i in range(0, len(rows), 100):
                    batch = rows[i:i + 100]
                    client.table(table).upsert(batch, on_conflict="id").execute()
                logger.info(f"[{table}] Seeded {len(rows)} rows to Supabase.")
            except Exception as e:
                logger.error(f"[{table}] Seed failed: {e}")
        else:
            logger.info(f"[{table}] Supabase has {count} rows — skip initial seed.")

    # ── 2. Push CSV changes to Supabase (CSV newer = offline edits) ─────────
    def _push_csv_to_supabase(self, client, csv_file: str, table: str):
        csv_path = os.path.join(DATA_DIR, csv_file)
        current_hash = _csv_file_hash(csv_path)
        last_hash = self.state.get(f"hash_{csv_file}", "")

        if current_hash == last_hash:
            return  # No changes

        rows = _read_csv(csv_path)
        if not rows:
            return

        logger.info(f"[{table}] CSV changed (offline edits detected) — pushing {len(rows)} rows to Supabase")
        try:
            for i in range(0, len(rows), 100):
                batch = rows[i:i + 100]
                client.table(table).upsert(batch, on_conflict="id").execute()
            self.state[f"hash_{csv_file}"] = current_hash
            logger.info(f"[{table}] CSV -> Supabase push complete.")
        except Exception as e:
            logger.error(f"[{table}] CSV->Supabase push failed: {e}")

    # ── 3. Pull Supabase changes back into CSV ───────────────────────────────
    def _pull_supabase_to_csv(self, client, csv_file: str, table: str):
        """Pull Supabase rows and merge into local CSV if Supabase has more/newer data."""
        csv_path = os.path.join(DATA_DIR, csv_file)
        local_rows = _read_csv(csv_path)
        local_ids = {row.get("id") for row in local_rows if row.get("id")}

        try:
            result = client.table(table).select("*").execute()
            remote_rows = result.data or []
        except Exception as e:
            logger.warning(f"[{table}] Could not pull from Supabase: {e}")
            return

        if not remote_rows:
            return

        remote_ids = {str(r.get("id")) for r in remote_rows}
        new_remote = [r for r in remote_rows if str(r.get("id")) not in local_ids]

        if new_remote:
            logger.info(f"[{table}] Supabase has {len(new_remote)} new rows not in local CSV — pulling")
            # Merge: local + new remote rows
            merged = local_rows + [{k: str(v) if v is not None else "" for k, v in r.items()} for r in new_remote]
            fieldnames = list(local_rows[0].keys()) if local_rows else list(new_remote[0].keys())
            _write_csv(csv_path, merged, fieldnames)

            # Also update hash so we don't re-push these on next cycle
            self.state[f"hash_{csv_file}"] = _csv_file_hash(csv_path)
            logger.info(f"[{table}] Supabase -> CSV pull complete.")
        else:
            logger.info(f"[{table}] Local CSV is in sync with Supabase.")

    # ── 4. Sync unsynced SQLite tickets -> Supabase ──────────────────────────
    def _sync_sqlite_tickets(self, client):
        """Push tickets from local SQLite that haven't been synced to Supabase yet."""
        try:
            from app.core.database import SessionLocal, TicketModel
            pri_map = {"EMERGENCY": 3, "URGENT": 2, "STANDARD": 1}
            db = SessionLocal()
            unsynced = db.query(TicketModel).filter(TicketModel.synced == False).all()

            if not unsynced:
                db.close()
                return

            logger.info(f"[tickets] Found {len(unsynced)} unsynced SQLite tickets — pushing to Supabase")
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
                    "created_at": record.created_at.isoformat(),
                }
                try:
                    client.table("tickets").upsert(payload, on_conflict="ticket_id").execute()
                    record.synced = True
                    db.add(record)
                except Exception as e:
                    err = str(e)
                    if "foreign key" in err or "23503" in err:
                        safe = dict(payload)
                        safe["department_id"] = None
                        safe["doctor_id"] = None
                        try:
                            client.table("tickets").upsert(safe, on_conflict="ticket_id").execute()
                            record.synced = True
                            db.add(record)
                        except Exception as e2:
                            logger.error(f"[tickets] Retry failed for {record.ticket_id}: {e2}")
                    else:
                        logger.error(f"[tickets] Upsert failed for {record.ticket_id}: {e}")

            db.commit()
            db.close()
            logger.info("[tickets] Unsynced SQLite tickets pushed to Supabase.")
        except Exception as e:
            logger.error(f"[tickets] SQLite sync error: {e}")

    # ── 5. Write offline JSON backup for all CSV tables ──────────────────────
    def _write_offline_backup(self, csv_file: str, table: str):
        """Keep a JSON snapshot of each CSV in data/backup_offline/ as a safety net."""
        csv_path = os.path.join(DATA_DIR, csv_file)
        rows = _read_csv(csv_path)
        if not rows:
            return
        backup_path = os.path.join(BACKUP_DIR, f"{table}_backup.json")
        try:
            with open(backup_path, "w", encoding="utf-8") as f:
                json.dump({"table": table, "backed_up_at": datetime.now(timezone.utc).isoformat(), "rows": rows}, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not write offline backup for {table}: {e}")

    # ── Main entry ────────────────────────────────────────────────────────────
    def verify_and_sync(self):
        online = _is_online()
        logger.info(f"--- BackupVerifier cycle --- [{'ONLINE' if online else 'OFFLINE'}] ---")

        # Always update offline JSON backups (regardless of connectivity)
        for csv_file, table in CSV_TABLE_MAP.items():
            self._write_offline_backup(csv_file, table)

        if not online:
            logger.info("System is OFFLINE — local CSV edits saved to backup_offline/. Will sync to Supabase when online.")
            # Record file hashes so we detect changes made during offline period
            for csv_file in CSV_TABLE_MAP:
                csv_path = os.path.join(DATA_DIR, csv_file)
                self.state[f"offline_hash_{csv_file}"] = _csv_file_hash(csv_path)
            _save_state(self.state)
            return

        client = _get_supabase_client()
        if not client:
            logger.warning("No Supabase client available — skipping remote sync.")
            return

        for csv_file, table in CSV_TABLE_MAP.items():
            try:
                # Step A: Seed if Supabase table is empty
                self._seed_if_empty(client, csv_file, table)

                # Step B: Push any offline CSV edits to Supabase
                self._push_csv_to_supabase(client, csv_file, table)

                # Step C: Pull any Supabase-only rows back to local CSV
                self._pull_supabase_to_csv(client, csv_file, table)
            except Exception as e:
                logger.error(f"[{table}] Unexpected error: {e}")

        # Step D: Sync SQLite ticket queue to Supabase
        try:
            self._sync_sqlite_tickets(client)
        except Exception as e:
            logger.error(f"[tickets] Sync error: {e}")

        _save_state(self.state)
        logger.info("--- BackupVerifier cycle complete ---")
