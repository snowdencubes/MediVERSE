from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Any
from app.services.ai_voice.voice_service import generate_voice_response, get_session_history

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

class HistoryResponse(BaseModel):
    session_id: str
    messages: List[ChatMessage]

@router.post("/chat", response_model=ChatResponse)
def chat_with_voice_assistant(request: ChatRequest):
    """Send a message to the AI voice assistant. Returns reply + any actions."""
    result = generate_voice_response(request.session_id, request.message)
    return ChatResponse(
        session_id=result["session_id"],
        reply=result["reply"],
        action=result.get("action"),
        action_data=result.get("action_data")
    )

@router.get("/history/{session_id}", response_model=HistoryResponse)
def get_chat_history(session_id: str):
    """Retrieve chat history for a session."""
    history = get_session_history(session_id)
    return HistoryResponse(
        session_id=session_id,
        messages=[ChatMessage(role=m["role"], content=m["content"]) for m in history]
    )
