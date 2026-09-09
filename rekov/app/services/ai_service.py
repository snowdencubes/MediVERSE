import os
import requests
import json

# IMPORTANT: Replace this placeholder with your actual Hugging Face token.
# Since your repository is private, you can hardcode it here or use environment variables.
HF_TOKEN = os.getenv("HF_TOKEN", "hf_Placeholder")

WHISPER_URL = "https://api-inference.huggingface.co/models/openai/whisper-large-v3"
LLM_URL = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct"

def transcribe_audio_hf(audio_bytes: bytes) -> str:
    """
    Sends the audio bytes to Hugging Face Whisper API for transcription.
    """
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
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
    Sends the transcribed text to Hugging Face LLM (Llama 3) to parse the medical issue.
    Expected output is a JSON containing:
    - issue: A concise medical description.
    - department: A guessed department_id.
    - is_emergency: Boolean.
    """
    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json",
    }
    
    prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a medical triage AI. Parse the patient's spoken text and return a strict JSON object with exactly these fields:
- issue (string): The concise medical issue.
- department (string): The best guess department (e.g. Cardiology, General, Pediatrics, Orthopedics, Neurology, Dermatology).
- is_emergency (boolean): true if it sounds like a life-threatening emergency (heart attack, severe bleeding, stroke), else false.
Output ONLY valid JSON. Do not include markdown formatting or explanations.<|eot_id|><|start_header_id|>user<|end_header_id|>
Patient text: {transcript}<|eot_id|><|start_header_id|>assistant<|end_header_id|>"""

    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 150,
            "return_full_text": False,
            "temperature": 0.1
        }
    }
    
    response = requests.post(LLM_URL, headers=headers, json=payload)
    response.raise_for_status()
    result = response.json()
    
    if isinstance(result, list) and len(result) > 0 and "generated_text" in result[0]:
        text_output = result[0]["generated_text"].strip()
    else:
        text_output = str(result)
        
    # Clean up markdown code blocks if the LLM still returns them
    text_output = text_output.replace("```json", "").replace("```", "").strip()
    
    try:
        data = json.loads(text_output)
        return {
            "issue": data.get("issue", transcript),
            "department": data.get("department", "General"),
            "is_emergency": data.get("is_emergency", False)
        }
    except json.JSONDecodeError:
        print("Failed to parse JSON from LLM:", text_output)
        return {
            "issue": transcript,
            "department": "General",
            "is_emergency": False
        }
