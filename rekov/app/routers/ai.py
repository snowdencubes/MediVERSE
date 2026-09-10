import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from app.core.database import SessionLocal, TicketModel

load_dotenv()
HF_API_TOKEN = os.getenv("HF_API_TOKEN")

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

        if not HF_API_TOKEN:
            return AISummaryResponse(summary="[Offline Mode] Patient has a triage score of " + str(ticket.triage_score) + " and selected " + str(ticket.combos_selected))

        # Call Hugging Face Qwen model
        headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
        # We can use Qwen2.5-7B-Instruct or a similar lightweight instruction model
        API_URL = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-1.5B-Instruct"
        
        response = requests.post(API_URL, headers=headers, json={
            "inputs": prompt,
            "parameters": {"max_new_tokens": 50, "temperature": 0.3},
            "options": {"wait_for_model": True}
        })

        if response.status_code == 200:
            result = response.json()
            # Parse the generated text
            if isinstance(result, list) and "generated_text" in result[0]:
                full_text = result[0]["generated_text"]
                # Extract only the summary part
                summary = full_text.split("Summary:")[-1].strip()
                return AISummaryResponse(summary=summary)
            
        # Fallback if API fails or model is loading
        return AISummaryResponse(summary=f"Patient {ticket.patient_name} requires attention for {ticket.combos_selected}. Triage level: {ticket.priority_level}.")

    finally:
        db.close()
