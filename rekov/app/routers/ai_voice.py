from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Any
import base64
from app.services.ai_voice.voice_service import generate_voice_response, get_session_history
from app.services.ai_voice.elevenlabs_service import generate_tts_audio

router = APIRouter(prefix="/ai_voice", tags=["AI Voice Interface"])

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatResponse(BaseModel):
    session_id: str
    reply: str
    action: Optional[str] = None
    action_data: Optional[dict] = None
    audio_base64: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = None

class TTSResponse(BaseModel):
    audio_base64: Optional[str] = None

@router.post("/tts", response_model=TTSResponse)
@router.post("/tts/", response_model=TTSResponse)
def synthesize_tts(request: TTSRequest):
    """Generate high-definition neural audio (Indian English / Hindi) for any text."""
    audio_bytes = generate_tts_audio(request.text, voice_id=request.voice)
    audio_b64 = None
    if audio_bytes:
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
    return TTSResponse(audio_base64=audio_b64)

@router.post("/chat", response_model=ChatResponse)
@router.post("/chat/", response_model=ChatResponse)
def chat_with_voice_assistant(request: ChatRequest):
    """Send a message to the AI voice assistant. Returns reply + any actions + TTS audio."""
    result = generate_voice_response(request.session_id, request.message)
    
    # Generate ElevenLabs TTS
    audio_b64 = None
    if result.get("reply"):
        audio_bytes = generate_tts_audio(result["reply"])
        if audio_bytes:
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
            
    return ChatResponse(
        session_id=result["session_id"],
        reply=result["reply"],
        action=result.get("action"),
        action_data=result.get("action_data"),
        audio_base64=audio_b64
    )

class HistoryResponse(BaseModel):
    session_id: str
    messages: List[ChatMessage]

@router.get("/history/{session_id}", response_model=HistoryResponse)
def get_chat_history(session_id: str):
    """Retrieve chat history for a session."""
    history = get_session_history(session_id)
    return HistoryResponse(
        session_id=session_id,
        messages=[ChatMessage(role=m["role"], content=m["content"]) for m in history]
    )

@router.get("/keywords")
@router.get("/keywords/")
def get_voice_keywords():
    """Retrieve dynamic list of wake words and confirm keywords."""
    import os, json
    kw_path = os.path.join(os.getcwd(), "data", "keywords.json")
    if os.path.exists(kw_path):
        with open(kw_path, encoding="utf-8") as f:
            return json.load(f)
    return {
        "wake_words": ["wake up", "hello", "jaag jao", "jaag jao prashant", "wake up prashant", "hey prashant", "prashant"],
        "confirm_words": ["yes", "haan", "ha", "sure", "continue", "ok"],
        "back_words": ["back", "peeche", "wapas", "main menu"]
    }
