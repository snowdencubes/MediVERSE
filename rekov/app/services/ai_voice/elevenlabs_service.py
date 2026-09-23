import os
import asyncio
import concurrent.futures
import requests
import edge_tts
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
DEFAULT_ELEVEN_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Multilingual voice

def _detect_language(text: str) -> str:
    """Detect if text contains Devanagari or regional Indian scripts, or Hinglish patterns."""
    for ch in text:
        cp = ord(ch)
        if 0x0900 <= cp <= 0x097F: return "hi"
        if 0x0980 <= cp <= 0x09FF: return "bn"
        if 0x0B80 <= cp <= 0x0BFF: return "ta"
        if 0x0C00 <= cp <= 0x0C7F: return "te"
        if 0x0A80 <= cp <= 0x0AFF: return "gu"
        if 0x0C80 <= cp <= 0x0CFF: return "kn"
        if 0x0D00 <= cp <= 0x0D7F: return "ml"

    # Common Roman Hindi / Hinglish cues
    lower = text.lower()
    hinglish_cues = ["aapke", "aapko", "bukhar", "dard", "karein", "kahein", "karna", "hoga", "uplabdh", "kripya", "namaste", "dhanyawad", "theek"]
    if any(cue in lower for cue in hinglish_cues):
        return "hi"
        
    return "en"

def _clean_tts_text(text: str) -> str:
    """Strip system action tags, markdown stars, brackets, and extra formatting."""
    clean = text
    for tag in ["[BOOK_TICKET]", "[CHECK_QUEUE]", "[LIST_DOCTORS]", "[UPLOAD_ABHA_DOCUMENTS]"]:
        if tag in clean:
            clean = clean.split(tag)[0]
    # Remove markdown bold/italics
    clean = clean.replace("*", "").replace("#", "").replace("_", " ").strip()
    return clean

async def _stream_edge_tts(text: str, voice: str) -> bytes:
    communicate = edge_tts.Communicate(text, voice)
    chunks = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
    return b"".join(chunks)

def generate_edge_tts_audio(text: str, voice: str | None = None) -> bytes | None:
    """Generate high-definition neural Indian English / Hindi voice audio using Edge-TTS."""
    clean = _clean_tts_text(text)
    if not clean:
        return None

    if not voice:
        lang = _detect_language(clean)
        if lang == "hi":
            voice = "hi-IN-SwaraNeural"  # Smooth natural Hindi
        elif lang == "ta":
            voice = "ta-IN-PallaviNeural"
        elif lang == "te":
            voice = "te-IN-ShrutiNeural"
        elif lang == "bn":
            voice = "bn-IN-TanishaaNeural"
        else:
            voice = "en-IN-NeerjaNeural"  # Smooth natural Indian English

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, _stream_edge_tts(clean, voice)).result()
    except Exception as e:
        print(f"[TTS] Edge-TTS generation error: {e}")
        return None

def generate_tts_audio(text: str, voice_id: str | None = None) -> bytes | None:
    """
    Dual-layer TTS:
    1. Uses ElevenLabs if API key is provided and functional.
    2. Falls back seamlessly to Edge-TTS Neural Voices (hi-IN-SwaraNeural & en-IN-NeerjaNeural).
    """
    clean = _clean_tts_text(text)
    if not clean:
        return None

    # Try ElevenLabs if configured
    if ELEVENLABS_API_KEY and len(ELEVENLABS_API_KEY) > 5:
        target_voice = voice_id or DEFAULT_ELEVEN_VOICE_ID
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{target_voice}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY
        }
        data = {
            "text": clean,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        try:
            response = requests.post(url, json=data, headers=headers, timeout=12)
            if response.status_code == 200:
                return response.content
            print(f"[TTS] ElevenLabs Error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"[TTS] ElevenLabs Connection Error: {e}")

    # Fallback to high-quality Microsoft Edge Neural TTS
    return generate_edge_tts_audio(clean, voice=voice_id)
