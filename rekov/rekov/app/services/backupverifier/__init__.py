"""
backupverifier — Bi-directional CSV <-> Supabase sync verifier.

Detects whether data was written locally (offline) or to Supabase (online) first,
and reconciles both directions automatically.
"""

from .scheduler import start_backup_verifier

__all__ = ["start_backup_verifier"]
