"""
BackupVerifier Scheduler — runs verify_and_sync() every 30 seconds in a daemon thread.
Also fires immediately on startup to do the initial CSV -> Supabase seed.
"""

import threading
import time
import logging

from .verifier import BackupVerifier

logger = logging.getLogger("backupverifier.scheduler")


def _run_loop():
    verifier = BackupVerifier()
    # First run immediately on startup
    try:
        verifier.verify_and_sync()
    except Exception as e:
        logger.error(f"Initial verify_and_sync failed: {e}")

    while True:
        time.sleep(30)
        try:
            verifier.verify_and_sync()
        except Exception as e:
            logger.error(f"verify_and_sync cycle error: {e}")


def start_backup_verifier():
    """Start the BackupVerifier in a background daemon thread."""
    t = threading.Thread(target=_run_loop, name="BackupVerifier", daemon=True)
    t.start()
    logger.info("[BackupVerifier] Started — verifying every 30s (CSV <-> Supabase bi-directional sync).")
