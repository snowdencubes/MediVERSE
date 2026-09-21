import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from app.core.database import SessionLocal, TicketModel

from pathlib import Path

load_dotenv()
_backend_env = Path(__file__).resolve().parents[3] / ".env"
_root_env = Path(__file__).resolve().parents[4] / ".env"
if _backend_env.exists():
    load_dotenv(_backend_env)
if _root_env.exists():
    load_dotenv(_root_env)

router = APIRouter(prefix="/ai", tags=["AI Summaries"])

class AISummaryResponse(BaseModel):
    summary: str

@router.get("/summary/{ticket_id}", response_model=AISummaryResponse)
def get_ai_summary(ticket_id: str):
    """Generate a medical summary using Hugging Face (Qwen model)."""
    db = SessionLocal()
    try:
        ticket = db.query(TicketModel).filter(TicketModel.ticket_id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        # Construct prompt
        prompt = (
            f"You are a medical assistant. Provide a very brief, professional 2-sentence summary "
            f"for a doctor regarding this patient:\\n"
            f"Patient Name: {ticket.patient_name}\\n"
            f"Triage Score: {ticket.triage_score}\\n"
            f"Combos Selected: {ticket.combos_selected}\\n"
            f"Priority: {ticket.priority_level}\\n"
            f"Summary:"
        )

        hf_api_token = os.getenv("HF_API_TOKEN", os.getenv("HUGGINGFACE_API_KEY", os.getenv("HF_TOKEN")))
        if not hf_api_token:
            return AISummaryResponse(summary="[Offline Mode] Patient has a triage score of " + str(ticket.triage_score) + " and selected " + str(ticket.combos_selected))

        API_URL = "https://router.huggingface.co/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {hf_api_token}",
            "Content-Type": "application/json"
        }
        
        qwen_models = [
            "Qwen/Qwen2.5-72B-Instruct",
            "Qwen/Qwen2.5-Coder-32B-Instruct"
        ]

        for model_name in qwen_models:
            try:
                response = requests.post(API_URL, headers=headers, json={
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": "You are a medical assistant. Provide a very brief, professional 2-sentence clinical summary for a doctor."},
                        {"role": "user", "content": f"Patient Name: {ticket.patient_name}\nTriage Score: {ticket.triage_score}\nCombos Selected: {ticket.combos_selected}\nPriority: {ticket.priority_level}"}
                    ],
                    "max_tokens": 60,
                    "temperature": 0.2
                }, timeout=10)

                if response.status_code == 200:
                    result = response.json()
                    choices = result.get("choices", [])
                    if choices and "message" in choices[0] and "content" in choices[0]["message"]:
                        summary = choices[0]["message"]["content"].strip()
                        return AISummaryResponse(summary=summary)
            except Exception as e:
                print(f"[AI Summary] Error with {model_name}: {e}")
            
        # Fallback if API fails or model is loading
        return AISummaryResponse(summary=f"Patient {ticket.patient_name} requires attention for {ticket.combos_selected}. Triage level: {ticket.priority_level}.")

    finally:
        db.close()
