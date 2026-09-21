import os
import requests
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
# Default to Rachel voice, or a professional voice
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM" 

def generate_tts_audio(text: str, voice_id: str = DEFAULT_VOICE_ID) -> bytes | None:
    """
    Generate TTS audio using ElevenLabs API.
    Returns raw MP3 audio bytes if successful, None otherwise.
    """
    if not ELEVENLABS_API_KEY:
        return None
        
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }
    
    try:
        response = requests.post(url, json=data, headers=headers, timeout=10)
        if response.status_code == 200:
            return response.content
        print(f"ElevenLabs Error: {response.status_code} - {response.text}")
        return None
    except Exception as e:
        print(f"ElevenLabs Connection Error: {e}")
        return None
