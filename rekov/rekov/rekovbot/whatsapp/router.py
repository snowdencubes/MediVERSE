from fastapi import APIRouter, Request, BackgroundTasks
import os
from dotenv import load_dotenv
from rekovbot.session_manager import get_or_create_session, update_session

load_dotenv()

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Bot Integration"])

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")

def process_whatsapp_message(chat_id: str, text: str):
    text = text.lower().strip()
    
    # Get state from Database
    state = get_or_create_session("whatsapp", chat_id)
    
    # WhatsApp specific logic
    if text in ["/start", "hi", "hello"]:
        state["step"] = "ask_name"
        reply = "Hello from WhatsApp! Welcome to MediVERSE Registration. Please enter your full name:"
    elif state.get("step") == "ask_name":
        state["name"] = text.title()
        state["step"] = "ask_phone"
        reply = f"Nice to meet you, {state['name']}. Please enter your phone number:"
    elif state.get("step") == "ask_phone":
        state["phone"] = text
        state["step"] = "ask_symptom"
        reply = "Great. Could you briefly describe your symptoms or reason for visit?"
    elif state.get("step") == "ask_symptom":
        state["symptoms"] = text
        state["step"] = "done"
        reply = "Thank you! Your registration is complete. You can now walk up to the Kiosk, and it will recognize your registration."
        # Here we would normally save this to the patient Database
    else:
        reply = "You are already registered! If you need a new appointment, type hi."

    # Update state in Database
    update_session("whatsapp", chat_id, state)

    # Here you would integrate with Meta's WhatsApp API to send `reply` back
    print(f"[WhatsApp] Reply to {chat_id}: {reply}")

@router.post("/webhook")
async def whatsapp_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Webhook endpoint for WhatsApp Business API.
    Requires Meta Developer Portal configuration.
    """
    try:
        data = await request.json()
        # Parse WhatsApp message format (mock implementation)
        # Normally data["entry"][0]["changes"][0]["value"]["messages"][0]
        print("WhatsApp Message received:", data)
        return {"status": "ok"}
    except Exception:
        return {"status": "error"}
