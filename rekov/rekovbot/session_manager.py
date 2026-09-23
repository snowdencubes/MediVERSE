import json
import uuid
from datetime import datetime
from app.core.database import SessionLocal, BotSession

def get_or_create_session(platform: str, chat_id: str) -> dict:
    """Gets the existing state for a chat_id or creates a new one."""
    db = SessionLocal()
    try:
        session = db.query(BotSession).filter(
            BotSession.platform == platform,
            BotSession.chat_id == str(chat_id)
        ).first()

        if session:
            # Update the updated_at timestamp to prevent purging
            session.updated_at = datetime.utcnow()
            db.commit()
            return json.loads(session.state)

        # Create new session
        new_state = {"step": "start"}
        new_session = BotSession(
            session_id=str(uuid.uuid4()),
            platform=platform,
            chat_id=str(chat_id),
            state=json.dumps(new_state)
        )
        db.add(new_session)
        db.commit()
        return new_state
    finally:
        db.close()

def update_session(platform: str, chat_id: str, state: dict):
    """Updates the state JSON for a specific chat_id."""
    db = SessionLocal()
    try:
        session = db.query(BotSession).filter(
            BotSession.platform == platform,
            BotSession.chat_id == str(chat_id)
        ).first()

        if session:
            session.state = json.dumps(state)
            db.commit()
    finally:
        db.close()

def delete_session(platform: str, chat_id: str):
    """Deletes a session manually if no longer needed."""
    db = SessionLocal()
    try:
        db.query(BotSession).filter(
            BotSession.platform == platform,
            BotSession.chat_id == str(chat_id)
        ).delete()
        db.commit()
    finally:
        db.close()
