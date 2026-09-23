from fastapi import APIRouter, Request, BackgroundTasks
import os
import requests
from dotenv import load_dotenv
from rekovbot.session_manager import get_or_create_session, update_session

load_dotenv()

router = APIRouter(prefix="/telegram", tags=["Telegram Bot Integration"])

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

def process_telegram_message(chat_id: str, text: str):
    text = text.lower().strip()
    
    # Get state from Database
    state = get_or_create_session("telegram", chat_id)
    
    if text in ["/start", "hi", "hello"]:
        state["step"] = "ask_name"
        reply = "Hello! Welcome to MediVERSE Registration. Please enter your full name:"
    elif state.get("step") == "start":
        state["step"] = "ask_name"
        reply = "Hello! Welcome to MediVERSE Registration. Please enter your full name:"
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
        reply = "You are already registered! If you need a new appointment, type /start."
        if text == "/start":
            state["step"] = "ask_name"
            reply = "Let's register again. Please enter your full name:"

    # Update state in Database
    update_session("telegram", chat_id, state)

    # Send reply via Telegram API
    if TELEGRAM_BOT_TOKEN:
        try:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            requests.post(url, json={"chat_id": chat_id, "text": reply}, timeout=5)
        except Exception as e:
            print(f"Telegram API Error: {e}")

@router.post("/webhook")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Webhook endpoint for Telegram Bot API.
    Set this up by calling: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>/api/v1/bot/telegram/webhook
    """
    try:
        data = await request.json()
        if "message" in data and "text" in data["message"]:
            chat_id = str(data["message"]["chat"]["id"])
            text = data["message"]["text"]
            # Process in background to avoid timeout
            background_tasks.add_task(process_telegram_message, chat_id, text)
        return {"status": "ok"}
    except Exception as e:
        print(f"Telegram Webhook Error: {e}")
        return {"status": "error"}
