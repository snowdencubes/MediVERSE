import os
import asyncio
import hashlib
import concurrent.futures
import requests
import edge_tts
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

# Read from env or config.json
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
if not ELEVENLABS_API_KEY:
    import json
    _root = Path(__file__).resolve().parent.parent.parent.parent
    for _p in [_root / "config.json", _root / "rekov" / "config.json"]:
        if _p.is_file():
            try:
                _cfg = json.loads(_p.read_text(encoding="utf-8"))
                ELEVENLABS_API_KEY = _cfg.get("elevenlabs_key") or _cfg.get("ELEVENLABS_KEY") or ""
                break
            except Exception:
                pass

DEFAULT_ELEVEN_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

# Simple file-based cache
CACHE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "tts_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

def _cache_key(text: str, voice_id: str) -> str:
    return hashlib.md5(f"{text}:{voice_id}".encode()).hexdigest()

def _get_cached(text: str, voice_id: str) -> bytes | None:
    path = CACHE_DIR / f"{_cache_key(text, voice_id)}.mp3"
    if path.is_file() and path.stat().st_size > 0:
        return path.read_bytes()
    return None

def _save_cache(text: str, voice_id: str, audio: bytes):
    try:
        (CACHE_DIR / f"{_cache_key(text, voice_id)}.mp3").write_bytes(audio)
    except Exception:
        pass

def _detect_language(text: str) -> str:
    for ch in text:
        cp = ord(ch)
        if 0x0900 <= cp <= 0x097F: return "hi"
        if 0x0980 <= cp <= 0x09FF: return "bn"
        if 0x0B80 <= cp <= 0x0BFF: return "ta"
        if 0x0C00 <= cp <= 0x0C7F: return "te"
        if 0x0A80 <= cp <= 0x0AFF: return "gu"
        if 0x0C80 <= cp <= 0x0CFF: return "kn"
        if 0x0D00 <= cp <= 0x0D7F: return "ml"
    lower = text.lower()
    hinglish_cues = ["aapke", "aapko", "bukhar", "dard", "karein", "kahein", "karna", "hoga", "uplabdh", "kripya", "namaste", "dhanyawad", "theek"]
    if any(cue in lower for cue in hinglish_cues):
        return "hi"
    return "en"

def _clean_tts_text(text: str) -> str:
    clean = text
    for tag in ["[BOOK_TICKET]", "[CHECK_QUEUE]", "[LIST_DOCTORS]", "[UPLOAD_ABHA_DOCUMENTS]"]:
        if tag in clean:
            clean = clean.split(tag)[0]
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
    clean = _clean_tts_text(text)
    if not clean:
        return None
    if not voice:
        lang = _detect_language(clean)
        if lang == "hi":
            voice = "hi-IN-SwaraNeural"
        elif lang == "ta":
            voice = "ta-IN-PallaviNeural"
        elif lang == "te":
            voice = "te-IN-ShrutiNeural"
        elif lang == "bn":
            voice = "bn-IN-TanishaaNeural"
        else:
            voice = "en-IN-NeerjaNeural"
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, _stream_edge_tts(clean, voice)).result()
    except Exception as e:
        print(f"[TTS] Edge-TTS generation error: {e}")
        return None

def generate_tts_audio(text: str, voice_id: str | None = None) -> bytes | None:
    """
    Dual-layer TTS with caching:
    1. Check cache first.
    2. Uses ElevenLabs if API key is provided.
    3. Falls back to Edge-TTS.
    """
    clean = _clean_tts_text(text)
    if not clean:
        return None
    target_voice = voice_id or DEFAULT_ELEVEN_VOICE_ID

    # Check cache
    cached = _get_cached(clean, target_voice)
    if cached:
        return cached

    # Try ElevenLabs
    if ELEVENLABS_API_KEY and len(ELEVENLABS_API_KEY) > 5:
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
                audio = response.content
                _save_cache(clean, target_voice, audio)
                return audio
            elif response.status_code == 401:
                print("[TTS] ElevenLabs Error: Invalid API key")
            elif response.status_code == 429:
                print("[TTS] ElevenLabs Error: Rate limited or no credits left")
            else:
                print(f"[TTS] ElevenLabs Error: {response.status_code}")
        except requests.exceptions.Timeout:
            print("[TTS] ElevenLabs Error: Request timed out")
        except requests.exceptions.ConnectionError:
            print("[TTS] ElevenLabs Error: Network unreachable")
        except Exception as e:
            print(f"[TTS] ElevenLabs Connection Error: {e}")

    # Fallback to Edge-TTS
    fallback = generate_edge_tts_audio(clean, voice=voice_id)
    if fallback:
        _save_cache(clean, voice_id or "edge", fallback)
    return fallback
