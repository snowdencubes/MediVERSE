import os
import csv
import uuid
import requests
from pathlib import Path
from typing import Dict, List
from dotenv import load_dotenv

load_dotenv()
HF_API_TOKEN = os.getenv("HF_API_TOKEN")

# ---- Load database context from CSV files ----
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "database"

def _load_csv(filename: str) -> list:
    filepath = DATA_DIR / filename
    if not filepath.exists():
        return []
    with open(filepath, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def _build_db_context() -> str:
    """Build a compact text representation of the hospital database for the AI."""
    departments = _load_csv("departments.csv")
    doctors = _load_csv("doctors.csv")
    combos = _load_csv("combos.csv")

    lines = ["=== HOSPITAL DATABASE (LIVE DATA) ==="]

    lines.append("\n-- DEPARTMENTS --")
    for d in departments:
        lines.append(f"  {d.get('code','?')}: {d.get('name','?')} | Wait: {d.get('wait_time_minutes','?')} min | ID: {d.get('id','?')}")

    lines.append("\n-- DOCTORS (CURRENTLY REGISTERED) --")
    for doc in doctors:
        avail = "AVAILABLE" if doc.get("is_available", "").lower() == "true" else "UNAVAILABLE"
        lines.append(
            f"  {doc.get('name','?')} | Dept: {doc.get('department_id','?')} | "
            f"Specialty: {doc.get('specialty','?')} | Room: {doc.get('room_number','?')} | "
            f"Fee: {doc.get('consultation_fee','?')} | Wait: {doc.get('estimated_wait_minutes','?')} min | "
            f"Rating: {doc.get('rating','?')} | Exp: {doc.get('experience_years','?')} yrs | "
            f"Shift: {doc.get('shift_schedule','?')} | Status: {avail} | ID: {doc.get('id','?')}"
        )

    if combos:
        lines.append("\n-- HEALTH COMBO PACKAGES --")
        for c in combos:
            lines.append(f"  {c.get('title','?')}: {c.get('description','?')} | Price: {c.get('price','?')} | ID: {c.get('id','?')}")

    return "\n".join(lines)

DB_CONTEXT = _build_db_context()

SYSTEM_PROMPT = f"""You are REKOV AI, the hospital's voice assistant. You speak naturally and helpfully.

CRITICAL RULES:
1. AUTO-DETECT the patient's language from their message. Reply in the SAME language they used. You understand English, Hindi, Tamil, Bengali, Marathi, Telugu, Kannada, Gujarati, Malayalam, Punjabi, Urdu, and broken/informal versions of all.
2. Keep replies SHORT (under 40 words). Be warm but efficient. Ask ONE follow-up at a time.
3. You have REAL access to the hospital database below. Use it to answer questions about doctors, departments, fees, wait times, availability.
4. When you have enough info to book, output EXACTLY: [BOOK_TICKET] dept_id=<ID> doctor_id=<ID> priority=<STANDARD|URGENT|EMERGENCY> patient_name=<name>
5. When user asks about queue/status, output: [CHECK_QUEUE] dept_id=<ID>
6. When user asks to list doctors, output: [LIST_DOCTORS] dept_id=<ID>
7. Do NOT make up data. Only use what's in the database below.
8. Understand broken English like "i have headake" = headache, "hart pain" = heart pain, "bachcha bimar" = child is sick, "dawai chahiye" = need medicine.
9. For emergency symptoms (chest pain, difficulty breathing, severe bleeding, unconscious), immediately route to Emergency with EMERGENCY priority.

{DB_CONTEXT}

BOOKING FLOW:
- Greet the patient
- Ask what they need help with
- Based on complaint, suggest a department and doctor
- Confirm with patient, then issue [BOOK_TICKET]
- If patient gives their name, use it. Otherwise use "Guest Patient".
"""

# ---- Session storage ----
_sessions: Dict[str, List[dict]] = {}

def get_or_create_session(session_id: str | None) -> tuple:
    """Return (session_id, history_list)."""
    if not session_id:
        session_id = str(uuid.uuid4())
    if session_id not in _sessions:
        _sessions[session_id] = []
    return session_id, _sessions[session_id]

def get_session_history(session_id: str) -> List[dict]:
    return _sessions.get(session_id, [])

def generate_voice_response(session_id: str | None, user_message: str) -> dict:
    """
    Main entry point. Takes a session_id and new user message.
    Returns dict with: session_id, reply, action, action_data
    """
    sid, history = get_or_create_session(session_id)

    # Add user message to history
    history.append({"role": "user", "content": user_message})

    if not HF_API_TOKEN:
        reply = "System is in offline mode. Please use the manual touch screen to book your ticket."
        history.append({"role": "assistant", "content": reply})
        return {"session_id": sid, "reply": reply, "action": None, "action_data": None}

    # Build Qwen chat prompt
    API_URL = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct"
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}

    prompt = f"<|im_start|>system\n{SYSTEM_PROMPT}<|im_end|>\n"
    for msg in history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        prompt += f"<|im_start|>{role}\n{content}<|im_end|>\n"
    prompt += "<|im_start|>assistant\n"

    try:
        response = requests.post(API_URL, headers=headers, json={
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 150,
                "temperature": 0.4,
                "top_p": 0.9,
                "repetition_penalty": 1.1
            }
        }, timeout=15)

        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and len(result) > 0 and "generated_text" in result[0]:
                full_text = result[0]["generated_text"]
                reply = full_text.split("<|im_start|>assistant\n")[-1].strip()
                reply = reply.split("<|im_end|>")[0].strip()
            else:
                reply = "I could not process that. Could you please repeat?"
        elif response.status_code == 503:
            # Model loading
            reply = "The AI model is loading, please wait a moment and try again."
        else:
            print(f"HF API Error {response.status_code}: {response.text[:200]}")
            reply = "I am having trouble connecting. Please try again in a moment."
    except requests.exceptions.Timeout:
        reply = "The request timed out. Please try again."
    except Exception as e:
        print(f"HF API Exception: {e}")
        reply = "I am having trouble connecting. Please use the manual touchscreen."

    # Parse actions from reply
    action = None
    action_data = None
    clean_reply = reply

    if "[BOOK_TICKET]" in reply:
        action = "BOOK_TICKET"
        # Parse: [BOOK_TICKET] dept_id=dep_card doctor_id=doc_3 priority=URGENT patient_name=Rahul
        parts_str = reply.split("[BOOK_TICKET]")[1].strip().split("\n")[0]
        action_data = {}
        for part in parts_str.split():
            if "=" in part:
                k, v = part.split("=", 1)
                action_data[k] = v
        # Remove the action token from displayed reply
        clean_reply = reply.split("[BOOK_TICKET]")[0].strip()
        if not clean_reply:
            clean_reply = "Booking your appointment now..."

    elif "[CHECK_QUEUE]" in reply:
        action = "CHECK_QUEUE"
        parts_str = reply.split("[CHECK_QUEUE]")[1].strip().split("\n")[0]
        action_data = {}
        for part in parts_str.split():
            if "=" in part:
                k, v = part.split("=", 1)
                action_data[k] = v
        clean_reply = reply.split("[CHECK_QUEUE]")[0].strip()
        if not clean_reply:
            clean_reply = "Let me check the queue for you..."

    elif "[LIST_DOCTORS]" in reply:
        action = "LIST_DOCTORS"
        parts_str = reply.split("[LIST_DOCTORS]")[1].strip().split("\n")[0]
        action_data = {}
        for part in parts_str.split():
            if "=" in part:
                k, v = part.split("=", 1)
                action_data[k] = v
        clean_reply = reply.split("[LIST_DOCTORS]")[0].strip()
        if not clean_reply:
            clean_reply = "Here are the available doctors..."

    history.append({"role": "assistant", "content": clean_reply})

    return {
        "session_id": sid,
        "reply": clean_reply,
        "action": action,
        "action_data": action_data
    }
