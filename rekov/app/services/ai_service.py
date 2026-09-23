import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
_backend_env = Path(__file__).resolve().parents[3] / ".env"
_root_env = Path(__file__).resolve().parents[4] / ".env"
if _backend_env.exists():
    load_dotenv(_backend_env)
if _root_env.exists():
    load_dotenv(_root_env)

from app.core.config import settings

# IMPORTANT: Replace this placeholder with your actual Hugging Face token.
# Since your repository is private, you can hardcode it here or use environment variables.

WHISPER_URL = "https://api-inference.huggingface.co/models/openai/whisper-large-v3"
LLM_URL = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct"

def transcribe_audio_hf(audio_bytes: bytes) -> str:
    """
    Sends the audio bytes to Hugging Face Whisper API for transcription.
    """
    hf_token = (
        settings.CONFIG.get("hf_token")
        or settings.CONFIG.get("HF_TOKEN")
        or getattr(settings, "HF_TOKEN", "")
        or os.getenv("HF_API_TOKEN")
        or os.getenv("HF_TOKEN", "hf_Placeholder")
    )
    headers = {"Authorization": f"Bearer {hf_token}"}
    response = requests.post(WHISPER_URL, headers=headers, data=audio_bytes)
    response.raise_for_status()
    result = response.json()
    if "text" in result:
        return result["text"]
    elif isinstance(result, list) and len(result) > 0 and "text" in result[0]:
        return result[0]["text"]
    else:
        return str(result)

def triage_symptoms_hf(transcript: str) -> dict:
    """
    Sends the transcribed text to Hugging Face Qwen LLM to parse the medical issue.
    Returns a JSON containing:
    - issue: A concise medical description.
    - department: A guessed department_id (e.g. Cardiology, General, Pediatrics, Orthopedics, Neurology, Dermatology).
    - is_emergency: Boolean.
    """
    hf_token = (
        settings.CONFIG.get("hf_token")
        or settings.CONFIG.get("HF_TOKEN")
        or getattr(settings, "HF_TOKEN", "")
        or os.getenv("HF_API_TOKEN")
        or os.getenv("HUGGINGFACE_API_KEY")
        or os.getenv("HF_TOKEN")
    )
    if not hf_token:
        return {
            "issue": transcript,
            "department": "General",
            "is_emergency": False
        }

    API_URL = "https://router.huggingface.co/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json",
    }
    
    system_prompt = (
        "You are a clinical triage AI. Parse the patient's spoken text and return a strict JSON object with exactly these fields:\n"
        "- issue (string): The concise medical issue.\n"
        "- department (string): Best department (Cardiology, General, Pediatrics, Orthopedics, Neurology, Dermatology, ENT, Gastroenterology).\n"
        "- is_emergency (boolean): true if it is an acute emergency (chest pain, stroke, heavy bleeding), else false.\n"
        "Return ONLY raw JSON, no markdown code blocks or explanations."
    )

    qwen_models = [
        "Qwen/Qwen2.5-72B-Instruct",
        "Qwen/Qwen2.5-Coder-32B-Instruct"
    ]

    for model in qwen_models:
        try:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": transcript}
                ],
                "max_tokens": 120,
                "temperature": 0.1
            }
            response = requests.post(API_URL, headers=headers, json=payload, timeout=12)
            if response.status_code == 200:
                result = response.json()
                choices = result.get("choices", [])
                if choices and "message" in choices[0] and "content" in choices[0]["message"]:
                    text_output = choices[0]["message"]["content"].strip()
                    text_output = text_output.replace("```json", "").replace("```", "").strip()
                    data = json.loads(text_output)
                    print(f"[QWEN] TRIAGE OK  {model} -> dept={data.get('department')} emg={data.get('is_emergency')}")
                    return {
                        "issue": data.get("issue", transcript),
                        "department": data.get("department", "General"),
                        "is_emergency": bool(data.get("is_emergency", False))
                    }
            else:
                print(f"[QWEN] TRIAGE FAIL {model} HTTP {response.status_code}: {response.text[:200]}")
        except Exception as e:
            print(f"[QWEN] TRIAGE ERR  {model}: {e}")

    # Fallback heuristic
    lower = transcript.lower()
    is_emg = any(w in lower for w in ["emergency", "chest pain", "heart attack", "bleeding", "unconscious"])
    dept = "Cardiology" if "chest" in lower or "heart" in lower else "General"
    return {
        "issue": transcript,
        "department": dept,
        "is_emergency": is_emg
    }
