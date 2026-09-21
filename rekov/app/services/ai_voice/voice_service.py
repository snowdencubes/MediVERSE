import os
import csv
import json
import uuid
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

SYSTEM_PROMPT = f"""You are REKOV AI, the hospital's voice assistant. You speak naturally, helpfully, and concisely.

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
4. EMERGENCY TRIAGE:
   - For chest pain, heavy bleeding, breathing difficulty, or unconsciousness, route immediately to Emergency with EMERGENCY priority.
5. SHORT & DIRECT:
   - Maximum 30 words per turn. Be fast, direct, and conversational.
6. HOSPITAL DATABASE ONLY:
   - Only use the real doctors, departments, and fees from the database below:

{DB_CONTEXT}
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


def classify_speech_intent(user_message: str, hf_api_token: str | None) -> dict:
    """
    Real-time speech intent and moderation classifier using Hugging Face router.
    Detects user intent (CONFIRM, DENY, MEDICAL, QUERY, OFF_TOPIC),
    identifies nonsense/shit-talk/trolling, and detects language.
    """
    lower = user_message.lower().strip()

    # 1. Ultra-fast (<1ms) heuristic checks for obvious binary yes/no responses
    confirm_words = [
        "yes", "haan", "ha", "haa", "haji", "ji haan", "sure", "proceed", "continue",
        "ok", "okay", "theek hai", "thik hai", "kar do", "chalo", "book it", "confirm",
        "yes please", "sahi hai", "pakka"
    ]
    deny_words = [
        "no", "nahi", "nahin", "naa", "cancel", "stop", "mat karo", "ruko", "reject",
        "dont", "don't", "wrong", "galat", "dusra", "change"
    ]
    
    words = lower.split()
    if any(lower == w or (len(words) <= 3 and w in words) for w in confirm_words):
        is_hi = any(k in lower for k in ["haan", "ha", "ji", "kar do", "theek", "chalo"])
        return {"intent": "CONFIRM", "is_nonsense": False, "lang": "hi" if is_hi else "en"}

    if any(lower == w or (len(words) <= 3 and w in words) for w in deny_words):
        is_hi = any(k in lower for k in ["nahi", "nahin", "naa", "mat", "ruko", "galat"])
        return {"intent": "DENY", "is_nonsense": False, "lang": "hi" if is_hi else "en"}

    # 2. Profanity, abuse, or blatant trolling ("shit talk") filter
    abusive_words = [
        "fuck", "shit", "bitch", "asshole", "chutiya", "madarchod", "bhosdike", "gandu",
        "idiot", "bakwaas", "faltu", "stupid", "lodu", "kutta", "harami", "rubbish"
    ]
    if any(aw in lower for aw in abusive_words):
        is_hi = any(k in lower for k in ["chutiya", "bakwaas", "faltu", "kutta", "harami", "gandu", "bhosdike"])
        return {"intent": "OFF_TOPIC", "is_nonsense": True, "lang": "hi" if is_hi else "en"}

    # 3. Call Hugging Face Router for intelligent real-time classification
    if hf_api_token:
        API_URL = "https://router.huggingface.co/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {hf_api_token}",
            "Content-Type": "application/json"
        }
        sys_p = (
            "You are an ultra-fast speech intent & moderation classifier for a hospital voice kiosk.\n"
            "Classify user utterance (English, Hindi, Hinglish, or slang/trolling/shit-talk).\n"
            "Return ONLY JSON:\n"
            "{\n"
            '  "intent": "CONFIRM" | "DENY" | "MEDICAL" | "QUERY" | "OFF_TOPIC",\n'
            '  "is_nonsense": boolean,\n'
            '  "lang": "en" | "hi" | "hinglish"\n'
            "}"
        )
        try:
            res = requests.post(API_URL, headers=headers, json={
                "model": "Qwen/Qwen2.5-72B-Instruct",
                "messages": [
                    {"role": "system", "content": sys_p},
                    {"role": "user", "content": user_message}
                ],
                "max_tokens": 50,
                "temperature": 0.0
            }, timeout=3.5)
            if res.status_code == 200:
                raw = res.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                raw = raw.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(raw)
                return {
                    "intent": parsed.get("intent", "MEDICAL"),
                    "is_nonsense": bool(parsed.get("is_nonsense", False)),
                    "lang": parsed.get("lang", "en")
                }
        except Exception as e:
            # Fallback to local heuristic
            pass

    # 4. Local heuristic fallback
    lang = _detect_language(user_message)
    dept_id = _match_department(user_message, lang)
    if dept_id:
        return {"intent": "MEDICAL", "is_nonsense": False, "lang": lang}
    return {"intent": "QUERY", "is_nonsense": False, "lang": lang}


def generate_voice_response(session_id: str | None, user_message: str) -> dict:
    """
    Main entry point. Takes a session_id and new user message.
    Returns dict with: session_id, reply, action, action_data
    """
    sid, history = get_or_create_session(session_id)
    sess_data = get_session_data(sid)

    # Add user message to history
    history.append({"role": "user", "content": user_message})

    hf_api_token = os.getenv("HUGGINGFACE_API_KEY", os.getenv("HF_TOKEN", os.getenv("HF_API_TOKEN")))
    
    # 1. Run automatic speech intent & moderation classification
    classification = classify_speech_intent(user_message, hf_api_token)
    intent = classification.get("intent", "MEDICAL")
    is_nonsense = classification.get("is_nonsense", False)
    lang = classification.get("lang", _detect_language(user_message))

    # 2. Handle Off-Topic / Shit-Talk / Nonsense Guardrail
    if is_nonsense or intent == "OFF_TOPIC":
        if lang in ["hi", "hinglish"]:
            reply = "Main MediVERSE hospital assistant hoon. Kya aapko kisi bimari ya doctor se milna hai? Kripya Haan ya Naa kahein."
        else:
            reply = "I am the MediVERSE hospital assistant. Are you looking to see a doctor or get a check-in token today? Please say Yes or No."
        
        history.append({"role": "assistant", "content": reply})
        return {
            "session_id": sid,
            "reply": reply,
            "action": None,
            "action_data": None
        }

    # 3. Handle Confirmation ("YES", "HAAN", "PROCEED") to pending recommendation
    if intent == "CONFIRM" and sess_data.get("pending_action"):
        pending = sess_data["pending_action"]
        sess_data["pending_action"] = None
        action = pending.get("action", "BOOK_TICKET")
        action_data = pending.get("action_data")

        if lang in ["hi", "hinglish"]:
            reply = "Aapka ticket book kar diya gaya hai! Token number screen par aa raha hai. Kya aapko kuch aur jankari chahiye? Haan ya Naa kahein."
        else:
            reply = "Your appointment token is booked and confirmed! Do you need help with anything else? Say Yes or No."

        history.append({"role": "assistant", "content": reply})
        return {
            "session_id": sid,
            "reply": reply,
            "action": action,
            "action_data": action_data
        }

    # 4. Handle Rejection ("NO", "NAHI", "CANCEL")
    if intent == "DENY" and sess_data.get("pending_action"):
        sess_data["pending_action"] = None
        if lang in ["hi", "hinglish"]:
            reply = "Theek hai, booking cancel kar di gayi hai. Kya aap kisi aur doctor ya department ko dekhna chahte hain? Haan ya Naa kahein."
        else:
            reply = "Understood, cancelled. Would you like to check another department or doctor? Say Yes or No."

        history.append({"role": "assistant", "content": reply})
        return {
            "session_id": sid,
            "reply": reply,
            "action": None,
            "action_data": None
        }

    if not hf_api_token:
        print("[AI Voice] No HuggingFace API key found, falling back to offline mode")
        return _offline_flow(sid, history, user_message)

    API_URL = "https://router.huggingface.co/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {hf_api_token}",
        "Content-Type": "application/json"
    }

    # Format messages for OpenAI-compatible chat completions
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history[-8:-1]: # keep last 8 messages for context
        role = msg.get("role", "user")
        if role in ("user", "assistant", "system"):
            messages.append({"role": role, "content": msg.get("content", "")})
    messages.append({"role": "user", "content": user_message})

    reply = None
    qwen_models = [
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
        action_data = {}
        for part in parts_str.split():
            if "=" in part:
                k, v = part.split("=", 1)
                action_data[k] = v
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

    elif "[UPLOAD_ABHA_DOCUMENTS]" in reply or ("ABHA" in reply and "upload" in reply.lower()):
        action = "UPLOAD_ABHA_DOCUMENTS"
        action_data = {"ref_id": sid}

    # If Qwen suggested a doctor/department without emitting the immediate tag, store as pending action
    dept_matched = _match_department(clean_reply, lang)
    if not action and dept_matched:
        doc = _get_best_doctor(dept_matched)
        doc_id = doc.get("id", "") if doc else ""
        sess_data["pending_action"] = {
            "action": "BOOK_TICKET",
            "action_data": {
                "dept_id": dept_matched,
                "doctor_id": doc_id,
                "priority": "EMERGENCY" if dept_matched == "dep_emg" else "STANDARD",
                "patient_name": "Guest Patient"
            }
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
