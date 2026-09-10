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
    "en": "Hello! I am the MediVERSE AI assistant. What health issue can I help you with today?",
    "hi": "नमस्ते! मैं MediVERSE AI सहायक हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?",
    "bn": "নমস্কার! আমি MediVERSE AI সহায়ক। আজ আপনার কী সমস্যা?",
    "ta": "வணக்கம்! நான் MediVERSE AI உதவியாளர். இன்று என்ன உதவி வேண்டும்?",
    "te": "నమస్కారం! నేను MediVERSE AI సహాయకుడిని. ఈరోజు ఏమి సహాయం కావాలి?",
    "mr": "नमस्कार! मी MediVERSE AI सहाय्यक आहे. आज काय मदत करू?",
    "gu": "નમસ્તે! હું MediVERSE AI સહાયક છું. આજે શું મદદ કરું?",
    "kn": "ನಮಸ್ಕಾರ! ನಾನು MediVERSE AI ಸಹಾಯಕ. ಇವತ್ತು ಏನು ಸಹಾಯ ಬೇಕು?",
    "ml": "നമസ്കാരം! ഞാൻ MediVERSE AI സഹായിയാണ്. ഇന്ന് എന്ത് സഹായം വേണം?",
    "pa": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ MediVERSE AI ਸਹਾਇਕ ਹਾਂ। ਅੱਜ ਕੀ ਮਦਦ ਕਰਾਂ?",
    "ur": "السلام علیکم! میں MediVERSE AI اسسٹنٹ ہوں۔ آج کیا مدد کر سکتا ہوں؟",
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
                if kw in lower:
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
            "hi": "🚨 यह EMERGENCY लग रहा है। मैं आपको तुरंत इमरजेंसी विभाग में सर्वोच्च प्राथमिकता पर भेज रहा हूँ!",
        },
        "not_understood": {
            "en": "I understand many languages! Could you describe your health issue? I can help book a doctor's appointment.",
            "hi": "मैं कई भाषाएं समझता हूँ! कृपया अपनी स्वास्थ्य समस्या बताएं, मैं डॉक्टर की अपॉइंटमेंट बुक कर सकता हूँ।",
        },
    }
    t = templates.get(key, {})
    text = t.get(lang, t.get("en", t.get("hi", "")))
    return text.format(**kwargs) if kwargs else text


def generate_voice_response(session_id: str | None, user_message: str) -> dict:
    """
    Main entry point. Takes a session_id and new user message.
    Returns dict with: session_id, reply, action, action_data
    """
    sid, history = get_or_create_session(session_id)

    # Add user message to history
    history.append({"role": "user", "content": user_message})

    if not HF_API_TOKEN:
        return _offline_flow(sid, history, user_message)

    # Build Qwen chat prompt
    API_URL = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-1.5B-Instruct"
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
            },
            "options": {"wait_for_model": True}
        }, timeout=30)

        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and len(result) > 0 and "generated_text" in result[0]:
                full_text = result[0]["generated_text"]
                reply = full_text.split("<|im_start|>assistant\n")[-1].strip()
                reply = reply.split("<|im_end|>")[0].strip()
            else:
                reply = "I could not process that. Could you please repeat?"
        elif response.status_code == 503:
            # Model loading — fall back to offline
            return _offline_flow(sid, history, user_message)
        else:
            print(f"HF API Error {response.status_code}: {response.text[:200]}")
            return _offline_flow(sid, history, user_message)
    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError, Exception) as e:
        print(f"HF API unreachable ({type(e).__name__}), using offline mode")
        return _offline_flow(sid, history, user_message)

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

    # Handle greetings / generic hellos
    greet_words = ["hi", "hello", "hey", "hii", "hiii", "namaste", "namaskar", "help", "helo",
                   "namaskaram", "vanakkam", "sat sri akal", "assalam", "salam"]
    is_greeting = any(g in lower for g in greet_words) and len(lower.split()) <= 4

    if state["step"] == "greeting" or is_greeting:
        # Check if user already mentioned symptoms in greeting
        dept_id = _match_department(user_message, lang)
        if dept_id:
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
            reply = _GREETINGS.get(lang, _GREETINGS["en"])
            state["step"] = "ask_symptom"

    elif state["step"] == "ask_symptom":
        dept_id = _match_department(user_message, lang)
        if dept_id:
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
        # User provides their name — now book
        patient_name = user_message.strip()
        if len(patient_name) < 2:
            patient_name = "Guest Patient"

        dept_id = state.get("dept_id") or "dep_gen"
        doctor = state.get("doctor")
        doctor_id = doctor.get("id", "") if doctor else ""
        doc_name = doctor.get("name", "Duty Specialist") if doctor else "Duty Specialist"
        dept_name = _get_dept_name(dept_id)
        priority = "EMERGENCY" if dept_id == "dep_emg" else "STANDARD"

        reply = _offline_reply(lang, "booking_done", doctor=doc_name, dept=dept_name)
        action = "BOOK_TICKET"
        action_data = {
            "dept_id": dept_id,
            "doctor_id": doctor_id,
            "priority": priority,
            "patient_name": patient_name
        }
        # Reset state for next conversation
        state["step"] = "done"

    else:
        # Done or unknown — restart
        reply = _GREETINGS.get(lang, _GREETINGS["en"])
        state["step"] = "ask_symptom"

    history.append({"role": "assistant", "content": reply})

    return {
        "session_id": sid,
        "reply": reply,
        "action": action,
        "action_data": action_data
    }
