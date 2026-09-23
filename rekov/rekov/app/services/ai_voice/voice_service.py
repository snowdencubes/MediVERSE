import os
import csv
import json
import uuid
import re
import requests
from pathlib import Path
from typing import Dict, List
from dotenv import load_dotenv

# Try loading from multiple likely .env locations
load_dotenv()
_backend_env = Path(__file__).resolve().parents[3] / ".env"
_root_env = Path(__file__).resolve().parents[4] / ".env"
if _backend_env.exists():
    load_dotenv(_backend_env)
if _root_env.exists():
    load_dotenv(_root_env)

from app.core.config import settings
from app.services.ai_voice.medical_classifier import classify as medical_classify

# ---- Load database context from CSV files ----
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "database"
if not DATA_DIR.exists():
    DATA_DIR = Path.cwd() / "data" / "database"

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

def _get_dynamic_system_prompt() -> str:
    base_db = _build_db_context()
    
    # Try fetching recent tickets
    recent_tickets_context = ""
    try:
        from app.services.queue_service import queue_service
        all_tickets = queue_service.get_all_tickets()
        if all_tickets:
            recent_tickets_context = "\n\n-- RECENT APPOINTMENT TICKETS --\n"
            for t in sorted(all_tickets, key=lambda x: x.created_at, reverse=True)[:10]:
                recent_tickets_context += f"  TICKET: {t.token_number} | Patient: {t.patient_name} | Dept: {t.department_name} | Doctor: {t.doctor_name} | Room: {t.room_number}\n"
    except Exception:
        pass

    return f"""You are RITMO, the hospital's voice assistant. You speak naturally, helpfully, and concisely.

CRITICAL RULES:
1. AUTO-DETECT LANGUAGE & MATCH EXACTLY:
   - If user speaks English, reply in English.
   - If user speaks Hindi (Devanagari script), reply in Hindi.
   - If user speaks Roman Hindi / Hinglish ("mujhe bukhar hai", "pet me dard", "doctor se milna hai"), reply in natural Hinglish.
2. MANDATORY YES/NO RULE:
   - EVERY SINGLE RESPONSE MUST END WITH A CLEAR, BINARY QUESTION ENDING IN 'Say Yes or No' (or 'हाँ या ना कहें' / 'Haan ya Naa kahein').
   - Example 1: "Based on your symptoms, I recommend Dr. Marcus in General Medicine. Shall I book your appointment token now? Say Yes or No."
   - Example 2: "Aapke bukhar ke liye General Medicine mein Dr. Amit Sharma uplabdh hain. Kya main aapka ticket book kar doon? Haan ya Naa kahein."
   - Example 3: "Dr. Elena is in Cardiology in Room 204. Would you like to consult her? Say Yes or No."
3. BOOKING FLOW & CONFIRMATION:
   - When proposing a doctor, ALWAYS end with: "Shall I book your appointment token now? Say Yes or No."
   - When the user confirms with "yes", "haan", "sure", "proceed", or "ok", output EXACTLY:
     [BOOK_TICKET] dept_id=<ID> doctor_id=<ID> priority=<STANDARD|URGENT|EMERGENCY> patient_name=<name>
4. RECEIPT GENERATION:
   - If the user asks for a receipt, bill, or invoice for their ticket, output EXACTLY:
     [GENERATE_RECEIPT] ticket_id=<ID>
5. EMERGENCY TRIAGE:
   - For chest pain, heavy bleeding, breathing difficulty, or unconsciousness, route immediately to Emergency with EMERGENCY priority.
6. SHORT & DIRECT:
   - Maximum 30 words per turn. Be fast, direct, and conversational.
7. HOSPITAL DATABASE ONLY:
   - Only use the real doctors, departments, and fees from the database below:

{base_db}{recent_tickets_context}
"""

# ---- Session storage with action state tracking ----
_sessions: Dict[str, dict] = {}

def get_or_create_session(session_id: str | None) -> tuple:
    """Return (session_id, history_list)."""
    if not session_id:
        session_id = str(uuid.uuid4())
    if session_id not in _sessions:
        _sessions[session_id] = {
            "history": [],
            "pending_action": None,
            "last_suggestion": None
        }
    return session_id, _sessions[session_id]["history"]

def get_session_data(session_id: str) -> dict:
    if session_id not in _sessions:
        _sessions[session_id] = {
            "history": [],
            "pending_action": None,
            "last_suggestion": None
        }
    return _sessions[session_id]

def get_session_history(session_id: str) -> List[dict]:
    sess = _sessions.get(session_id)
    if isinstance(sess, dict):
        return sess.get("history", [])
    elif isinstance(sess, list):
        return sess
    return []

def _detect_language(text: str) -> str:
    """Detect script/language from text."""
    for ch in text:
        cp = ord(ch)
        if 0x0900 <= cp <= 0x097F: return "hi"
        if 0x0980 <= cp <= 0x09FF: return "bn"
        if 0x0B80 <= cp <= 0x0BFF: return "ta"
        if 0x0C00 <= cp <= 0x0C7F: return "te"
        if 0x0900 <= cp <= 0x097F: return "mr"  # Devanagari shared
        if 0x0A80 <= cp <= 0x0AFF: return "gu"
        if 0x0C80 <= cp <= 0x0CFF: return "kn"
        if 0x0D00 <= cp <= 0x0D7F: return "ml"
        if 0x0A00 <= cp <= 0x0A7F: return "pa"
        if 0x0600 <= cp <= 0x06FF: return "ur"
    return "en"


# Keyword-to-department mapping covering English + Hindi + common Hinglish + regional dialects
_DEPT_KEYWORDS = {
    "dep_emg": {
        "en": ["emergency", "accident", "bleeding", "unconscious", "breathless", "heart attack", "stroke",
                "seizure", "faint", "collapse", "critical", "ambulance", "dying"],
        "hi": ["emergency", "hadsa", "khoon", "behosh", "saans nahi", "heart attack", "gir gaya",
                "bahut kharab", "jaldi", "turant", "trauma"],
    },
    "dep_card": {
        "en": ["heart", "chest", "cardiac", "cardio", "palpitation", "bp", "blood pressure"],
        "hi": ["dil", "seena", "dhadkan", "dharkan", "saans", "blood pressure", "hart", "chhati", "chhati me dard", "dil me dard"],
        "bn": ["hridoy", "buk", "chhati"],
        "ta": ["idhayam", "nenju"],
        "te": ["gunde", "chhathi"],
    },
    "dep_ortho": {
        "en": ["bone", "joint", "back", "knee", "fracture", "spine", "shoulder", "leg", "arm", "hip", "ankle"],
        "hi": ["haddi", "jodon", "pair", "kamar", "ghutna", "toot", "haath", "ped", "back pain", "haath toot gya", "tang me dard", "moch", "toot gaya"],
        "bn": ["har", "gora", "hatu"],
        "ta": ["elumbu", "moottu"],
        "te": ["emuka", "mokalu"],
    },
    "dep_neuro": {
        "en": ["brain", "nerve", "headache", "paralysis", "migraine", "fits", "numbness", "seizure"],
        "hi": ["dimaag", "sar dard", "sir dard", "chakkar", "lakwa", "nass", "migraine", "dora", "chakar aa raha", "suuna parna"],
    },
    "dep_ophta": {
        "en": ["eye", "vision", "cataract", "optical", "sight", "blind", "glaucoma"],
        "hi": ["aankh", "ankhon", "aakh", "dhundhla", "chashma", "ankhon me chhubhan", "eye pain"],
    },
    "dep_ent": {
        "en": ["ear", "nose", "throat", "sinus", "snoring", "deaf", "hearing", "tonsil"],
        "hi": ["kaan", "naak", "gala", "kan me dard", "naak band", "gala kharab", "tonsil"],
    },
    "dep_derm": {
        "en": ["skin", "rash", "allergy", "itch", "pimple", "hair", "dermatology", "fungal"],
        "hi": ["chamdi", "khujli", "daane", "rashes", "bal jhar", "chehre pe daane", "skin allergy"],
    },
    "dep_gyn": {
        "en": ["pregnancy", "period", "women", "maternity", "pcos", "ovary"],
        "hi": ["mahila", "period", "mc problem", "pregnancy", "garbh", "pet me dard lady"],
    },
    "dep_gastro": {
        "en": ["stomach", "liver", "digestion", "acidity", "gas", "constipation", "diarrhea", "ulcer"],
        "hi": ["pet", "gas", "acidity", "kabz", "khana nahi pach raha", "pet dard", "kabaj"],
    },
    "dep_pulm": {
        "en": ["asthma", "lungs", "breathing", "wheezing", "chest tightness", "respiratory"],
        "hi": ["dama", "asthma", "saans lene me dikkat", "phapra", "saans phulna"],
    },
    "dep_psych": {
        "en": ["stress", "anxiety", "depression", "sleep", "mental", "behavior", "insomnia"],
        "hi": ["tension", "stress", "depression", "nind nahi aana", "dimag me pareshani"],
    },
    "dep_uro": {
        "en": ["kidney", "urine", "bladder", "stone", "prostate", "dialysis"],
        "hi": ["kidney", "pathri", "peshab", "peshab me jalan", "kidney stone"],
    },
    "dep_ped": {
        "en": ["child", "kid", "baby", "infant", "pediatric", "toddler", "newborn", "son", "daughter"],
        "hi": ["bacha", "bachcha", "bache", "bacchi", "beta", "beti", "chhota", "nanhi", "shishu", "bache ko bukhar"],
        "bn": ["bachcha", "chhele", "meye"],
        "ta": ["kuzhanthai", "pillai"],
        "te": ["pillalu", "bidda"],
    },
    "dep_gen": {
        "en": ["fever", "cold", "cough", "headache", "stomach", "vomit", "pain", "sick", "ill", "doctor",
                "not well", "unwell", "body", "weakness", "tired", "nausea", "diarrhea", "infection",
                "throat", "flu", "allergy", "rash", "skin", "ache", "hurts"],
        "hi": ["bukhar", "sardi", "khansi", "khasi", "sir dard", "pet", "ulti", "dard", "bimar",
                "tabiyat", "kamzori", "thakan", "gala", "jukham", "bimari", "dawai", "ilaj",
                "pet dard", "sar dard", "chakkar", "pasina", "tang me dard"],
        "bn": ["jor", "thanda", "kashi", "matha", "pet", "bomi"],
        "ta": ["kaichal", "jalam", "iruma", "thalai", "vayiru"],
        "te": ["jwaram", "daggu", "tala", "kallu"],
    },
}

# Replies in detected language (ZERO EMOJIS)
_GREETINGS = {
    "en": "Hello! I am the RITMO assistant. What health issue can I help you with today?",
    "hi": "नमस्ते! मैं RITMO सहायक हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?",
    "bn": "নমস্কার! আমি RITMO সহায়ক। আজ আপনার কী সমস্যা?",
    "ta": "வணக்கம்! நான் RITMO உதவியாளர். இன்று என்ன உதவி வேண்டும்?",
    "te": "నమస్కారం! నేను RITMO సహాయకుడిని. ఈరోజు ఏమి సహాయం కావాలి?",
    "mr": "नमस्कार! मी RITMO सहाय्यक आहे. आज काय मदत करू?",
    "gu": "નમસ્તે! હું RITMO સહાયક છું. આજે શું મદદ કરું?",
    "kn": "ನಮಸ್ಕಾರ! ನಾನು RITMO ಸಹಾಯಕ. ಇವತ್ತು ಏನು ಸಹಾಯ ಬೇಕು?",
    "ml": "നമസ്കാരം! ഞാൻ RITMO സഹായിയാണ്. ഇന്ന് എന്ത് സഹായം വേണം?",
    "pa": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ RITMO ਸਹਾਇਕ ਹਾਂ। ਅੱਜ ਕੀ ਮਦਦ ਕਰਾਂ?",
    "ur": "السلام علیکم! میں RITMO اسسٹنٹ ہوں۔ آج کیا مدد کر سکتا ہوں؟",
}


def _match_department(text: str, lang: str) -> str | None:
    """Match user text to a department ID using comprehensive symptom rules."""
    lower = text.lower()
    # Check all departments in prioritized clinical order
    dept_order = ["dep_emg", "dep_card", "dep_ortho", "dep_neuro", "dep_pulm", "dep_gastro",
                  "dep_ophta", "dep_ent", "dep_derm", "dep_gyn", "dep_psych", "dep_uro",
                  "dep_ped", "dep_gen"]
    for dept_id in dept_order:
        keywords = _DEPT_KEYWORDS.get(dept_id, {})
        for kw_lang in [lang, "en", "hi", "bn", "ta", "te"]:
            for kw in keywords.get(kw_lang, []):
                if len(kw) <= 4:
                    if re.search(r'\b' + re.escape(kw) + r'\b', lower):
                        return dept_id
                elif kw in lower:
                    return dept_id
    return None


def _get_dept_name(dept_id: str) -> str:
    departments = _load_csv("departments.csv")
    for d in departments:
        if d.get("id") == dept_id:
            return d.get("name", dept_id)
    return dept_id


def _get_best_doctor(dept_id: str) -> dict | None:
    doctors = _load_csv("doctors.csv")
    available = [d for d in doctors if d.get("department_id") == dept_id and d.get("is_available", "").lower() == "true"]
    if not available:
        return None
    # Sort by rating descending
    available.sort(key=lambda d: float(d.get("rating", 0)), reverse=True)
    return available[0]


def _offline_reply(lang: str, key: str, **kwargs) -> str:
    """Generate localized replies for the offline flow with ZERO emojis."""
    templates = {
        "suggest_dept": {
            "en": "Based on your symptoms, I recommend the **{dept}** department. {doctor_info} Shall I book an appointment?",
            "hi": "आपके लक्षणों के अनुसार, मैं **{dept}** विभाग सुझाता हूँ। {doctor_info} क्या मैं अपॉइंटमेंट बुक करूँ?",
        },
        "doctor_info": {
            "en": "Dr. {name} is available (Room {room}, Fee: ₹{fee}, Wait: ~{wait} min).",
            "hi": "डॉ. {name} उपलब्ध हैं (कमरा {room}, शुल्क: ₹{fee}, प्रतीक्षा: ~{wait} मिनट)।",
        },
        "confirm_book": {
            "en": "Great! What is your name please? I will book your ticket right away.",
            "hi": "बढ़िया! कृपया अपना नाम बताएं, मैं तुरंत आपका टिकट बुक करता हूँ।",
        },
        "booking_done": {
            "en": "Booking your appointment now with Dr. {doctor} in {dept}...",
            "hi": "डॉ. {doctor} के साथ {dept} में आपकी अपॉइंटमेंट बुक हो रही है...",
        },
        "ask_symptom": {
            "en": "Could you tell me what health problem you are experiencing? For example: fever, headache, chest pain, or bone/joint pain.",
            "hi": "कृपया बताएं आपको क्या तकलीफ़ है? जैसे: बुखार, सिर दर्द, छाती में दर्द, या हड्डी/जोड़ का दर्द।",
        },
        "emergency": {
            "hi": "[EMERGENCY] यह EMERGENCY लग रहा है। मैं आपको तुरंत इमरजेंसी विभाग में सर्वोच्च प्राथमिकता पर भेज रहा हूँ!",
        },
        "not_understood": {
            "en": "I understand many languages! Could you describe your health issue? I can help book a doctor's appointment.",
            "hi": "मैं कई भाषाएं समझता हूँ! कृपया अपनी स्वास्थ्य समस्या बताएं, मैं डॉक्टर की अपॉइंटमेंट बुक कर सकता हूँ।",
        },
    }
    t = templates.get(key, {})
    text = t.get(lang, t.get("en", t.get("hi", "")))
    return text.format(**kwargs) if kwargs else text


def classify_speech_intent(user_message: str, hf_api_token: str | None) -> dict:
    """
    Classify patient utterance using the dedicated medical_classifier module.
    Handles English, Hindi, Hinglish, slang (e.g. 'naali me girgya madadad chahiye').
    Returns: {intent, is_nonsense, lang, department, urgency, is_emergency}
    """
    try:
        from app.services.ai_voice.medical_classifier import classify
        result = classify(user_message, hf_token=hf_api_token)
        # Map to the format expected by voice_service
        intent = result.get("intent", "MEDICAL")
        lang = result.get("lang", _detect_language(user_message))
        is_emergency = result.get("is_emergency", False)

        # Profanity filter (override intent for abusive input)
        abusive_words = ["fuck", "shit", "bitch", "asshole", "chutiya", "madarchod", "bhosdike", "gandu",
                         "idiot", "bakwaas", "faltu", "stupid", "lodu", "kutta", "harami"]
        lower = user_message.lower()
        is_nonsense = any(aw in lower for aw in abusive_words)
        if is_nonsense:
            intent = "OFF_TOPIC"

        return {
            "intent": intent,
            "is_nonsense": is_nonsense,
            "lang": lang,
            "department": result.get("department", "General Medicine"),
            "urgency": result.get("urgency", "LOW"),
            "is_emergency": is_emergency,
        }
    except Exception as e:
        print(f"[CLASSIFIER] Error: {e} — using basic heuristic")
        lang = _detect_language(user_message)
        lower = user_message.lower()
        words = lower.split()
        confirm_words = ["yes", "haan", "ha", "sure", "ok", "okay", "theek", "bilkul", "proceed", "confirm"]
        deny_words = ["no", "nahi", "nahin", "naa", "cancel", "mat", "ruko"]
        emg_words = ["emergency", "accident", "unconscious", "behosh", "girgya", "naali", "bachao", "bleeding"]
        if any(w in words for w in confirm_words) and len(words) <= 4:
            return {"intent": "CONFIRM", "is_nonsense": False, "lang": lang, "department": "General Medicine", "urgency": "LOW", "is_emergency": False}
        if any(w in words for w in deny_words) and len(words) <= 3:
            return {"intent": "DENY", "is_nonsense": False, "lang": lang, "department": "General Medicine", "urgency": "LOW", "is_emergency": False}
        is_emg = any(kw in lower for kw in emg_words)
        return {"intent": "MEDICAL", "is_nonsense": False, "lang": lang,
                "department": "Emergency" if is_emg else "General Medicine",
                "urgency": "HIGH" if is_emg else "LOW", "is_emergency": is_emg}


def _extract_name_from_text(text: str, is_explicit_name_turn: bool = False) -> str:
    """Extract patient name from user utterance with hospital context awareness."""
    cleaned = text.strip()
    patterns = [
        r"(?:mera\s+naam|my\s+name\s+is|i\s+am|myself|naam\s+mera)\s+([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)(?:\s+(?:hai|h|ko|aur|mujhe|and|i|my|ji|\.|\,)|$)",
        r"(?:ticket\s+for|appointment\s+for|token\s+for|book\s+for|ke\s+liye)\s+([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)(?:\s+(?:in|with|doctor|dep|mein|ke|ko|\.|\,)|$)",
        r"for\s+([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)\s+(?:in|with|doctor|dep)",
        r"([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)\s+(?:mera\s+naam|naam\s+hai)"
    ]
    for pat in patterns:
        m = re.search(pat, cleaned, re.IGNORECASE)
        if m:
            extracted = m.group(1).strip()
            extracted = re.sub(r"\b(hai|ji|h|sir|madam|ko|in|with|department|doctor|general|medicine|mujhe|bukhar|dard)\b", "", extracted, flags=re.IGNORECASE).strip()
            if len(extracted) >= 2 and extracted.lower() not in ["guest", "patient", "user"]:
                return extracted.title()

    if not is_explicit_name_turn:
        # If user was describing symptoms and didn't use an explicit name pattern, don't guess names from symptom words!
        return ""

    stop_words = [
        "hai", "mera", "naam", "my", "name", "is", "ji", "h", "bhi", "book", "ticket",
        "appointment", "token", "doctor", "dr", "dr.", "karo", "kar", "do", "please",
        "for", "in", "general", "medicine", "yes", "haan", "sure", "proceed", "a", "an", "the",
        "cardiology", "orthopedics", "pediatrics", "emergency", "neurology", "patient",
        "i", "have", "am", "feel", "feeling", "got", "suffering", "fever", "cough", "cold",
        "pain", "problem", "issue", "help", "need", "want", "mujhe", "dard", "bukhar"
    ]
    words = [w for w in cleaned.split() if w.lower() not in stop_words]
    if words:
        candidate = " ".join(words[:2]).title()
        if len(candidate) >= 2 and candidate.lower() not in ["guest", "patient", "user"]:
            return candidate
    return "Guest Patient"



def _extract_phone_from_text(text: str) -> str:
    """Extract 10-digit mobile number from digits or spoken number words."""
    digits = re.sub(r"\D", "", text)
    if len(digits) >= 10:
        return digits[-10:]
    num_map = {
        "zero": "0", "shunya": "0", "sunya": "0", "one": "1", "ek": "1", "two": "2", "do": "2",
        "three": "3", "teen": "3", "four": "4", "char": "4", "chaar": "4",
        "five": "5", "paanch": "5", "panch": "5", "six": "6", "chhah": "6", "che": "6",
        "seven": "7", "saat": "7", "sat": "7", "eight": "8", "aath": "8", "ath": "8",
        "nine": "9", "nau": "9", "no": "9"
    }
    extracted_digits = []
    for w in text.lower().replace("-", " ").replace(",", " ").split():
        if w in num_map:
            extracted_digits.append(num_map[w])
        elif w.isdigit():
            extracted_digits.append(w)
    combined = "".join(extracted_digits)
    if len(combined) >= 10:
        return combined[-10:]
    elif len(combined) >= 4:
        return combined
    return digits if digits else "9876543210"


def _extract_age_from_text(text: str) -> int:
    """Extract age in years from user text."""
    m = re.search(r"\b(\d{1,2})\b", text)
    if m:
        val = int(m.group(1))
        if 1 <= val <= 110:
            return val
    age_words = {
        "bees": 20, "pachees": 25, "tees": 30, "paintees": 35, "chalis": 40,
        "paintalis": 45, "pachas": 50, "saath": 60, "sattar": 70, "assi": 80
    }
    for w in text.lower().split():
        if w in age_words:
            return age_words[w]
    return 30


def _booking_reply(t_dict: dict, lang: str) -> str:
    """Build the full post-booking confirmation reply including a Yes/No follow-up prompt."""
    name = t_dict["patient_name"]
    token = t_dict["token_number"]
    doc = t_dict["doctor_name"]
    dept = t_dict["department_name"]
    room = t_dict["room_number"]
    if lang in ["hi", "hinglish"]:
        return (
            f"Badhai ho {name} ji! Aapka token {token} confirm ho gaya hai. "
            f"Dr. {doc} ({dept}), Kamra number {room}. "
            f"Aapki digital receipt screen par taiyar hai. "
            f"Kya aapko aur koi madad chahiye? Haan ya Naa kahein."
        )
    return (
        f"Congratulations {name}! Your appointment token {token} is confirmed "
        f"with Dr. {doc} in {dept} (Room {room}). Your digital receipt is ready on screen. "
        f"Would you like any further assistance? Say Yes or No."
    )


def _execute_ticket_booking(
    dept_id: str = "dep_gen",
    doctor_id: str | None = None,
    patient_name: str = "Guest Patient",
    patient_phone: str = "9999999999",
    patient_age: int = 30,
    priority: str = "STANDARD"
) -> dict:
    """
    Directly creates the ticket in SQLite via queue_service.
    Generates real token number (e.g. GEN-1, CARD-1), logs to receipts.csv,
    updates offline JSON snapshots and returns the complete ticket dict.
    """
    try:
        from app.services.queue_service import queue_service
        from app.schemas.kiosk_schemas import TicketCreateRequest, PatientRegistration, VitalsInput

        if not dept_id or dept_id not in queue_service.departments:
            dept_id = "dep_gen"

        if not doctor_id or doctor_id not in queue_service.doctors:
            best_doc = _get_best_doctor(dept_id)
            if best_doc and "id" in best_doc:
                doctor_id = best_doc["id"]

        clean_name = (patient_name or "Guest Patient").strip()
        if clean_name.lower() in ["patient", "user", "me", "myself", "mera", "self", "kiosk", "none", "guest"]:
            clean_name = "Guest Patient"

        vitals = None
        if priority == "EMERGENCY" or dept_id == "dep_emg":
            priority = "EMERGENCY"
            vitals = VitalsInput(heart_rate=120, temperature_c=39.0, pain_score=9, symptoms=["Voice Emergency Triage"])

        req = TicketCreateRequest(
            department_id=dept_id,
            doctor_id=doctor_id if doctor_id else None,
            combo_package_ids=[],
            vitals=vitals,
            patient=PatientRegistration(
                national_id=f"VOICE-{uuid.uuid4().hex[:6].upper()}",
                full_name=clean_name,
                phone=patient_phone or "9999999999",
                age=patient_age or 30,
                gender="O"
            ),
            payment_method="EXPRESS_CARD"
        )

        ticket = queue_service.create_ticket(req)
        clean_doc = ticket.doctor_name
        if clean_doc.startswith("Dr. "): clean_doc = clean_doc[4:]
        elif clean_doc.startswith("Dr "): clean_doc = clean_doc[3:]

        clean_rm = ticket.room_number
        if clean_rm.lower().startswith("room "): clean_rm = clean_rm[5:]
        elif clean_rm.lower().startswith("room"): clean_rm = clean_rm[4:]

        return {
            "ticket_id": ticket.ticket_id,
            "token_number": ticket.token_number,
            "department_id": ticket.department_id,
            "department_name": ticket.department_name,
            "doctor_id": ticket.doctor_id,
            "doctor_name": clean_doc,
            "room_number": clean_rm,
            "patient_name": ticket.patient_name,
            "patient_phone": ticket.patient_phone,
            "status": ticket.status,
            "priority_level": ticket.priority_level,
            "triage_score": ticket.triage_score,
            "total_fee": ticket.total_fee,
            "created_at": ticket.created_at,
            "estimated_call_time": ticket.estimated_call_time
        }
    except Exception as err:
        print(f"[AI Voice] Error executing ticket booking in queue_service: {err}")
        return {
            "ticket_id": f"tck-{uuid.uuid4().hex[:8]}",
            "token_number": f"{dept_id.replace('dep_', '').upper()}-1",
            "department_id": dept_id,
            "department_name": _get_dept_name(dept_id),
            "doctor_id": doctor_id or "",
            "doctor_name": "Duty Specialist",
            "room_number": "Room 101",
            "patient_name": patient_name or "Guest Patient",
            "patient_phone": patient_phone or "9999999999",
            "status": "WAITING",
            "priority_level": priority,
            "triage_score": 1,
            "total_fee": 35.0,
            "created_at": "Now",
            "estimated_call_time": "~5-10 mins"
        }


def generate_voice_response(session_id: str | None, user_message: str) -> dict:
    """
    Main entry point. Takes a session_id and new user message.
    Returns dict with: session_id, reply, action, action_data
    """
    sid, history = get_or_create_session(session_id)
    sess_data = get_session_data(sid)

    # Add user message to history
    history.append({"role": "user", "content": user_message})

    hf_api_token = (
        settings.CONFIG.get("hf_token")
        or settings.CONFIG.get("HF_TOKEN")
        or getattr(settings, "HF_TOKEN", "")
        or os.getenv("HUGGINGFACE_API_KEY")
        or os.getenv("HF_TOKEN")
        or os.getenv("HF_API_TOKEN")
    )
    
    # 1. Run automatic speech intent & moderation classification
    classification = classify_speech_intent(user_message, hf_api_token)
    intent = classification.get("intent", "MEDICAL")
    is_nonsense = classification.get("is_nonsense", False)
    lang = classification.get("lang", _detect_language(user_message))

    # 2. Handle Off-Topic / Shit-Talk Guardrail (Only for actual abusive trolling)
    if is_nonsense and any(aw in user_message.lower() for aw in ["fuck", "chutiya", "madarchod", "bhosdike", "gandu"]):
        reply = "Main RITMO hospital assistant hoon. Kripya apni bimari ya doctor ke bare mein bataein. Haan ya Naa kahein." if lang in ["hi", "hinglish"] else "I am the RITMO hospital assistant. Please describe your health symptom or doctor query."
        history.append({"role": "assistant", "content": reply})
    # 2.5 Handle Post-Booking Yes / No follow-up response
    if sess_data.get("post_booking"):
        sess_data["post_booking"] = None
        yes_words = ["yes", "haan", "ha", "sure", "ok", "okay", "help", "madad", "chahiye"]
        no_words = ["no", "nahi", "naa", "nahin", "thanks", "thank you", "shukriya", "bas", "done", "bye", "nope"]
        user_lower = user_message.lower()
        if any(w in user_lower.split() for w in no_words) or intent == "DENY":
            if lang in ["hi", "hinglish"]:
                reply = "Bahut dhanyawaad! Token number display par aane par doctor ke kamre mein pahuchein. Aapka din shubh ho!"
            else:
                reply = "Thank you! Please proceed to your consultation room when your token is called. Wishing you good health!"
            history.append({"role": "assistant", "content": reply})
            return {"session_id": sid, "reply": reply, "action": None, "action_data": None}
        elif any(w in user_lower.split() for w in yes_words) or intent == "CONFIRM":
            if lang in ["hi", "hinglish"]:
                reply = "Zaroor! Main RITMO voice assistant aapki madad ke liye taiyar hoon. Aap kisi aur department, doctor ya sawaal ke bare mein puch sakte hain."
            else:
                reply = "Certainly! I am here to help. You can ask about other departments, doctor schedules, wait times, or hospital guidance."
            history.append({"role": "assistant", "content": reply})
            return {"session_id": sid, "reply": reply, "action": None, "action_data": None}

    # 3. Handle Active Multi-Turn Patient Registration State Machine
    pending = sess_data.get("pending_action")

    # Rejection ("NO", "NAHI", "CANCEL") at any stage
    if intent == "DENY" and pending:
        sess_data["pending_action"] = None
        if lang in ["hi", "hinglish"]:
            reply = "Theek hai, booking cancel kar di gayi hai. Kya aap kisi aur doctor ya department ko dekhna chahte hain? Haan ya Naa kahein."
        else:
            reply = "Understood, booking cancelled. Would you like to check another department or doctor? Say Yes or No."
        history.append({"role": "assistant", "content": reply})
        return {"session_id": sid, "reply": reply, "action": None, "action_data": None}

    # Step A: User provides name during COLLECT_NAME stage -> Book immediately!
    if pending and pending.get("stage") == "COLLECT_NAME":
        patient_name = _extract_name_from_text(user_message, is_explicit_name_turn=True)
        dept_id = pending.get("dept_id", "dep_gen")
        doctor_id = pending.get("doctor_id")
        priority = pending.get("priority", "STANDARD")

        # Execute Real Booking in SQLite & Receipts
        t_dict = _execute_ticket_booking(
            dept_id=dept_id,
            doctor_id=doctor_id,
            patient_name=patient_name,
            patient_phone="9999999999",
            patient_age=30,
            priority=priority
        )
        sess_data["pending_action"] = None
        sess_data["post_booking"] = True

        reply = _booking_reply(t_dict, lang)

        history.append({"role": "assistant", "content": reply})
        return {
            "session_id": sid,
            "reply": reply,
            "action": "BOOK_TICKET",
            "action_data": {
                "ticket": t_dict,
                "token_number": t_dict["token_number"],
                "ticket_id": t_dict["ticket_id"],
                "doctor_name": t_dict["doctor_name"],
                "room_number": t_dict["room_number"],
                "department_name": t_dict["department_name"],
                "total_fee": t_dict["total_fee"]
            }
        }

    # Step B: User Confirms ("YES", "HAAN", "PROCEED", "KAR DO") to doctor recommendation
    if intent == "CONFIRM":
        if pending and pending.get("stage") == "AWAITING_CONFIRM":
            p_name = pending.get("patient_name")
            if p_name and p_name.lower() not in ["", "patient", "user", "guest patient", "none"]:
                # Name already provided, book immediately!
                t_dict = _execute_ticket_booking(
                    dept_id=pending.get("dept_id", "dep_gen"),
                    doctor_id=pending.get("doctor_id"),
                    patient_name=p_name,
                    patient_phone="9999999999",
                    patient_age=30,
                    priority=pending.get("priority", "STANDARD")
                )
                sess_data["pending_action"] = None
                sess_data["post_booking"] = True

                reply = _booking_reply(t_dict, lang)

                history.append({"role": "assistant", "content": reply})
                return {
                    "session_id": sid,
                    "reply": reply,
                    "action": "BOOK_TICKET",
                    "action_data": {
                        "ticket": t_dict,
                        "token_number": t_dict["token_number"],
                        "ticket_id": t_dict["ticket_id"],
                        "doctor_name": t_dict["doctor_name"],
                        "room_number": t_dict["room_number"],
                        "department_name": t_dict["department_name"],
                        "total_fee": t_dict["total_fee"]
                    }
                }
            else:
                # Ask for name once before issuing
                pending["stage"] = "COLLECT_NAME"
                if lang in ["hi", "hinglish"]:
                    reply = "Bahut badhiya! Appointment token ke liye kripya apna naam bataein? (Ya 'Guest' kahein)"
                else:
                    reply = "Great! What name should I put on your appointment token? (Or say 'Guest')"
                history.append({"role": "assistant", "content": reply})
                return {"session_id": sid, "reply": reply, "action": None, "action_data": None}

        elif not pending:
            dept_matched = _match_department(user_message, lang) or "dep_gen"
            doc = _get_best_doctor(dept_matched)
            doc_name = doc.get("name", "Duty Specialist") if doc else "Duty Specialist"
            dept_name = _get_dept_name(dept_matched)
            sess_data["pending_action"] = {
                "action": "BOOK_TICKET",
                "stage": "AWAITING_CONFIRM",
                "dept_id": dept_matched,
                "doctor_id": doc.get("id", "") if doc else "",
                "doctor_name": doc_name,
                "patient_name": "",
                "priority": "EMERGENCY" if dept_matched == "dep_emg" else "STANDARD"
            }
            if lang in ["hi", "hinglish"]:
                reply = f"Aapke liye {dept_name} mein Dr. {doc_name} uplabdh hain. Kya main aapka ticket book kar doon? Haan ya Naa kahein."
            else:
                reply = f"Dr. {doc_name} is available in {dept_name}. Shall I book your appointment token now? Say Yes or No."
            history.append({"role": "assistant", "content": reply})
            return {"session_id": sid, "reply": reply, "action": None, "action_data": None}

    if not hf_api_token:
        print("[AI Voice] No HuggingFace API key found, falling back to offline mode")
        return _offline_flow(sid, history, user_message)

    API_URL = "https://router.huggingface.co/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {hf_api_token}",
        "Content-Type": "application/json"
    }

    # Format messages for OpenAI-compatible chat completions
    messages = [{"role": "system", "content": _get_dynamic_system_prompt()}]
    for msg in history[-8:-1]: # keep last 8 messages for context
        role = msg.get("role", "user")
        if role in ("user", "assistant", "system"):
            messages.append({"role": role, "content": msg.get("content", "")})
    messages.append({"role": "user", "content": user_message})

    reply = None
    qwen_models = [
        "Qwen/Qwen2.5-7B-Instruct",
        "Qwen/Qwen2.5-72B-Instruct",
        "Qwen/Qwen2.5-Coder-32B-Instruct"
    ]

    for model_name in qwen_models:
        try:
            payload = {
                "model": model_name,
                "messages": messages,
                "max_tokens": 150,
                "temperature": 0.3,
                "top_p": 0.9
            }
            response = requests.post(API_URL, headers=headers, json=payload, timeout=15)
            if response.status_code == 200:
                result = response.json()
                choices = result.get("choices", [])
                if choices and "message" in choices[0] and "content" in choices[0]["message"]:
                    reply = choices[0]["message"]["content"].strip()
                    break
            else:
                print(f"[AI Voice] HF model {model_name} returned {response.status_code}: {response.text[:150]}")
        except Exception as err:
            print(f"[AI Voice] Error calling {model_name}: {err}")

    if not reply:
        print("[AI Voice] Qwen cloud API unavailable, using offline clinical flow")
        return _offline_flow(sid, history, user_message)

    # Enforce YES/NO ending if missing from Qwen output
    lower_reply = reply.lower()
    has_yes_no = any(yn in lower_reply for yn in ["yes or no", "haan ya naa", "ha ya na", "हाँ या ना", "yes/no", "yes or"])
    if not has_yes_no:
        if any(w in lower_reply for w in ["dr.", "doctor", "department", "triage", "book", "token"]):
            if _detect_language(reply) == "hi" or any(h in lower_reply for h in ["hai", "karein", "aapko", "chahiye"]):
                reply += " Kya main ise book kar doon? Haan ya Naa kahein."
            else:
                reply += " Shall I book this for you? Say Yes or No."

    # Parse actions from reply
    action = None
    action_data = None
    clean_reply = reply

    if "[BOOK_TICKET]" in reply:
        action = "BOOK_TICKET"
        parts_str = reply.split("[BOOK_TICKET]")[1].strip().split("\n")[0]
        parsed_args = {}
        for part in parts_str.split():
            if "=" in part:
                k, v = part.split("=", 1)
                parsed_args[k] = v

        dept_id = parsed_args.get("dept_id") or _match_department(user_message, lang) or "dep_gen"
        doctor_id = parsed_args.get("doctor_id")
        raw_name = parsed_args.get("patient_name") or _extract_name_from_text(user_message)
        priority = parsed_args.get("priority", "STANDARD")

        t_dict = _execute_ticket_booking(
            dept_id=dept_id,
            doctor_id=doctor_id,
            patient_name=raw_name,
            patient_phone="9999999999",
            patient_age=30,
            priority=priority
        )
        action_data = {
            "ticket": t_dict,
            "token_number": t_dict["token_number"],
            "ticket_id": t_dict["ticket_id"],
            "doctor_name": t_dict["doctor_name"],
            "room_number": t_dict["room_number"],
            "department_name": t_dict["department_name"],
            "total_fee": t_dict["total_fee"]
        }
        clean_reply = reply.split("[BOOK_TICKET]")[0].strip()
        if not clean_reply or len(clean_reply) < 10:
            clean_reply = _booking_reply(t_dict, lang)
        else:
            clean_reply += f" Token: {t_dict['token_number']} (Room {t_dict['room_number']}). Would you like further help? Say Yes or No."

    elif "[GENERATE_RECEIPT]" in reply:
        action = "GENERATE_RECEIPT"
        parts_str = reply.split("[GENERATE_RECEIPT]")[1].strip().split("\n")[0]
        parsed_args = {}
        for part in parts_str.split():
            if "=" in part:
                k, v = part.split("=", 1)
                parsed_args[k] = v
        
        ticket_id = parsed_args.get("ticket_id")
        action_data = {"ticket_id": ticket_id}
        clean_reply = reply.split("[GENERATE_RECEIPT]")[0].strip()
        if not clean_reply or len(clean_reply) < 5:
            clean_reply = "I am generating your receipt now."
            
        # We also need a URL to send back
        # Real PDF URL generation will be on the frontend with the ticket ID
        # So we just pass the action to the frontend

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

    elif "[UPLOAD_ABHA_DOCUMENTS]" in reply or ("ABHA" in reply and "upload" in reply.lower()):
        action = "UPLOAD_ABHA_DOCUMENTS"
        action_data = {"ref_id": sid}

    # If Qwen suggested a doctor/department without emitting the immediate tag, store as pending action
    dept_matched = _match_department(clean_reply, lang) or _match_department(user_message, lang)
    if not action and (dept_matched or any(w in clean_reply.lower() for w in ["dr.", "doctor", "department", "book", "token", "triage", "karein", "chahiye"])):
        final_dept = dept_matched or "dep_gen"
        doc = _get_best_doctor(final_dept)
        doc_id = doc.get("id", "") if doc else ""
        doc_name = doc.get("name", "Duty Specialist") if doc else "Duty Specialist"
        extracted_pname = _extract_name_from_text(user_message, is_explicit_name_turn=False)
        if extracted_pname == "Guest Patient":
            extracted_pname = ""
        sess_data["pending_action"] = {
            "action": "BOOK_TICKET",
            "stage": "AWAITING_CONFIRM",
            "dept_id": final_dept,
            "doctor_id": doc_id,
            "doctor_name": doc_name,
            "patient_name": extracted_pname,
            "patient_phone": "",
            "patient_age": 30,
            "priority": "EMERGENCY" if final_dept == "dep_emg" else "STANDARD"
        }

    history.append({"role": "assistant", "content": clean_reply})

    return {
        "session_id": sid,
        "reply": clean_reply,
        "action": action,
        "action_data": action_data
    }


# ---- Offline session state ----
_offline_state: Dict[str, dict] = {}

def _offline_flow(sid: str, history: List[dict], user_message: str) -> dict:
    """
    Rule-based offline fallback that handles multi-step booking without any LLM.
    Tracks conversation state per session: greeting → symptom → suggest → confirm → book.
    """
    lang = _detect_language(user_message)
    lower = user_message.lower().strip()

    # Get or init session state
    if sid not in _offline_state:
        _offline_state[sid] = {"step": "greeting", "dept_id": None, "doctor": None, "lang": lang}
    state = _offline_state[sid]
    state["lang"] = lang  # update based on latest message

    action = None
    action_data = None

    # Handle Back / Main Menu Intent
    back_words = ["back", "peeche", "wapas", "cancel", "main menu", "home", "start over"]
    if any(bw in lower for bw in back_words):
        _offline_state[sid] = {"step": "greeting", "dept_id": None, "doctor": None, "lang": lang}
        return {
            "session_id": sid,
            "reply": "Returned to main menu. How can I help you today?",
            "action": "GO_BACK",
            "action_data": None
        }

    # Handle ABHA & Medical Document Upload Intent
    abha_words = ["abha", "document", "upload", "record", "report", "abha card", "card"]
    if any(aw in lower for aw in abha_words):
        return {
            "session_id": sid,
            "reply": "Please scan the QR code to upload your ABHA card or medical documents. It will auto-fill your details instantly.",
            "action": "UPLOAD_ABHA_DOCUMENTS",
            "action_data": {"ref_id": sid}
        }

    # Run medical classifier on every input for smart routing
    classification = medical_classify(user_message)
    intent = classification.get("intent", "QUERY")
    class_dept_name = classification.get("department", "General Medicine")
    
    # Map department string to ID (e.g. "Emergency" -> "dep_emg")
    dept_id = None
    if intent == "MEDICAL" or intent == "CONFIRM":
        # Rough mapping from classifier to internal ID
        name_to_id = {
            "Emergency": "dep_emg", "Cardiology": "dep_card", "Orthopedics": "dep_ortho",
            "Pediatrics": "dep_ped", "Neurology": "dep_neuro", "Dermatology": "dep_derm",
            "ENT": "dep_ent", "Gastroenterology": "dep_gastro", "General Medicine": "dep_gen",
            "Pharmacy": "dep_pharm" # Assuming Pharmacy might be there
        }
        dept_id = name_to_id.get(class_dept_name) or _match_department(user_message, lang)

    # Handle greetings / generic hellos
    greet_words = ["hi", "hello", "hey", "hii", "hiii", "namaste", "namaskar", "helo",
                   "namaskaram", "vanakkam", "sat sri akal", "assalam", "salam"]
    is_greeting = (
        state["step"] not in ["confirm_dept", "confirm_name", "done"]
        and any(g in lower.split() for g in greet_words)
        and len(lower.split()) <= 3
    )

    if state["step"] == "greeting" or is_greeting:
        if intent == "MEDICAL" and dept_id:
            state["dept_id"] = dept_id
            doctor = _get_best_doctor(dept_id)
            state["doctor"] = doctor
            dept_name = _get_dept_name(dept_id)

            if dept_id == "dep_emg":
                reply = _offline_reply(lang, "emergency")
                state["step"] = "confirm_name"
            else:
                doc_info = ""
                if doctor:
                    doc_name = doctor.get("name", "?").replace("Dr. ", "").replace("Dr ", "").replace("Dr.", "")
                    doc_info = _offline_reply(lang, "doctor_info",
                        name=doc_name,
                        room=doctor.get("room_number", "?"),
                        fee=doctor.get("consultation_fee", "?"),
                        wait=doctor.get("estimated_wait_minutes", "?"))
                reply = _offline_reply(lang, "suggest_dept", dept=dept_name, doctor_info=doc_info)
                state["step"] = "confirm_dept"
        else:
            reply = _GREETINGS.get(lang, _GREETINGS["en"])
            state["step"] = "ask_symptom"

    elif state["step"] == "ask_symptom":
        if intent == "MEDICAL" and dept_id:
            state["dept_id"] = dept_id
            doctor = _get_best_doctor(dept_id)
            state["doctor"] = doctor
            dept_name = _get_dept_name(dept_id)

            if dept_id == "dep_emg":
                reply = _offline_reply(lang, "emergency")
                state["step"] = "confirm_name"
            else:
                if doctor:
                    doc_name = doctor.get("name", "?").replace("Dr. ", "").replace("Dr ", "").replace("Dr.", "")
                    doc_info = _offline_reply(lang, "doctor_info",
                        name=doc_name,
                        room=doctor.get("room_number", "?"),
                        fee=doctor.get("consultation_fee", "?"),
                        wait=doctor.get("estimated_wait_minutes", "?"))
                else:
                    doc_info = ""
                reply = _offline_reply(lang, "suggest_dept", dept=dept_name, doctor_info=doc_info)
                state["step"] = "confirm_dept"
        else:
            reply = _offline_reply(lang, "ask_symptom")

    elif state["step"] == "confirm_dept":
        # User says yes/no to department suggestion
        yes_words = ["yes", "haan", "ha", "ok", "sure", "book", "theek", "thik", "acha", "accha",
                     "chalo", "kar do", "karo", "please", "ji", "haa", "sahi", "done", "okay"]
        no_words = ["no", "nahi", "naa", "nahin", "change", "dusra", "aur", "other"]

        if any(w in lower for w in yes_words):
            p_name = state.get("patient_name")
            if p_name and p_name.lower() not in ["", "patient", "guest patient", "none"]:
                dept_id = state.get("dept_id") or "dep_gen"
                doctor = state.get("doctor")
                doc_id = doctor.get("id", "") if doctor else ""
                priority = "EMERGENCY" if dept_id == "dep_emg" else "STANDARD"

                t_dict = _execute_ticket_booking(
                    dept_id=dept_id,
                    doctor_id=doc_id,
                    patient_name=p_name,
                    patient_phone="9999999999",
                    patient_age=30,
                    priority=priority
                )
                action = "BOOK_TICKET"
                action_data = {
                    "ticket": t_dict,
                    "token_number": t_dict["token_number"],
                    "ticket_id": t_dict["ticket_id"],
                    "doctor_name": t_dict["doctor_name"],
                    "room_number": t_dict["room_number"],
                    "department_name": t_dict["department_name"],
                    "total_fee": t_dict["total_fee"]
                }
                reply = _booking_reply(t_dict, lang)
                state["step"] = "done"
            else:
                reply = _offline_reply(lang, "confirm_book")
                state["step"] = "confirm_name"
        elif any(w in lower for w in no_words):
            reply = _offline_reply(lang, "ask_symptom")
            state["step"] = "ask_symptom"
            state["dept_id"] = None
            state["doctor"] = None
        else:
            # Treat as symptom re-entry
            dept_id = _match_department(user_message, lang)
            if dept_id:
                state["dept_id"] = dept_id
                state["doctor"] = _get_best_doctor(dept_id)
                dept_name = _get_dept_name(dept_id)
                doc = state["doctor"]
                doc_info = ""
                if doc:
                    doc_info = _offline_reply(lang, "doctor_info",
                        name=doc.get("name", "?"), room=doc.get("room_number", "?"),
                        fee=doc.get("consultation_fee", "?"), wait=doc.get("estimated_wait_minutes", "?"))
                reply = _offline_reply(lang, "suggest_dept", dept=dept_name, doctor_info=doc_info)
            else:
                reply = _offline_reply(lang, "confirm_book")
                state["step"] = "confirm_name"

    elif state["step"] == "confirm_name":
        patient_name = _extract_name_from_text(user_message, is_explicit_name_turn=True)
        dept_id = state.get("dept_id") or "dep_gen"
        doctor = state.get("doctor")
        doc_id = doctor.get("id", "") if doctor else ""
        priority = "EMERGENCY" if dept_id == "dep_emg" else "STANDARD"

        t_dict = _execute_ticket_booking(
            dept_id=dept_id,
            doctor_id=doc_id,
            patient_name=patient_name,
            patient_phone="9999999999",
            patient_age=30,
            priority=priority
        )
        action = "BOOK_TICKET"
        action_data = {
            "ticket": t_dict,
            "token_number": t_dict["token_number"],
            "ticket_id": t_dict["ticket_id"],
            "doctor_name": t_dict["doctor_name"],
            "room_number": t_dict["room_number"],
            "department_name": t_dict["department_name"],
            "total_fee": t_dict["total_fee"]
        }
        reply = _booking_reply(t_dict, lang)
        state["step"] = "done"

    elif state["step"] == "done":
        yes_words = ["yes", "haan", "ha", "sure", "ok", "okay", "help", "madad", "chahiye"]
        no_words = ["no", "nahi", "naa", "nahin", "thanks", "thank you", "shukriya", "bas", "done", "bye", "nope"]
        if any(w in lower.split() for w in no_words):
            if lang in ["hi", "hinglish"]:
                reply = "Bahut dhanyawaad! Token number display par aane par doctor ke kamre mein pahuchein. Aapka din shubh ho!"
            else:
                reply = "Thank you! Please proceed to your consultation room when your token is called. Wishing you good health!"
            state["step"] = "idle"
        elif any(w in lower.split() for w in yes_words):
            if lang in ["hi", "hinglish"]:
                reply = "Zaroor! Main RITMO voice assistant aapki madad ke liye taiyar hoon. Aap kisi aur doctor ya department ke bare mein puch sakte hain."
            else:
                reply = "Certainly! You can ask about other departments, doctor availability, or hospital guidance."
            state["step"] = "ask_symptom"
        else:
            dept_id = _match_department(user_message, lang)
            if dept_id:
                state["dept_id"] = dept_id
                state["doctor"] = _get_best_doctor(dept_id)
                dept_name = _get_dept_name(dept_id)
                doc = state["doctor"]
                doc_info = ""
                if doc:
                    doc_info = _offline_reply(lang, "doctor_info",
                        name=doc.get("name", "?"), room=doc.get("room_number", "?"),
                        fee=doc.get("consultation_fee", "?"), wait=doc.get("estimated_wait_minutes", "?"))
                reply = _offline_reply(lang, "suggest_dept", dept=dept_name, doctor_info=doc_info)
                state["step"] = "confirm_dept"
            else:
                reply = _GREETINGS.get(lang, _GREETINGS["en"])
                state["step"] = "ask_symptom"

    else:
        # Unknown state — restart
        reply = _GREETINGS.get(lang, _GREETINGS["en"])
        state["step"] = "ask_symptom"

    history.append({"role": "assistant", "content": reply})

    return {
        "session_id": sid,
        "reply": reply,
        "action": action,
        "action_data": action_data,
        "is_ivr_mode": True
    }
