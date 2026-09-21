from fastapi import APIRouter, Request
from pydantic import BaseModel
import urllib.request
import urllib.error
import json
import os

router = APIRouter()

# Module-level storage for user-overridden currency
_user_currency_override: str | None = None

class CurrencyResponse(BaseModel):
    currency: str
    country: str
    ip: str

class CurrencyUpdate(BaseModel):
    currency: str

class HfTokenUpdate(BaseModel):
    token: str

class HfTokenStatusResponse(BaseModel):
    status: str  # "valid", "invalid", "empty", "error"
    connected: bool
    username: str = ""
    detail: str = ""

def _verify_hf_token_direct(token: str) -> dict:
    """Verifies a Hugging Face token with the official API."""
    token = token.strip() if token else ""
    if not token:
        return {"status": "empty", "connected": False, "username": "", "detail": "No token provided"}

    url = "https://huggingface.co/api/whoami-v2"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "MediVERSE-System/1.0"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            name = data.get("name", "") or data.get("fullname", "") or "Authorized User"
            return {"status": "valid", "connected": True, "username": name, "detail": "Connected to Hugging Face"}
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            return {"status": "invalid", "connected": False, "username": "", "detail": "Invalid or unauthorized token (HTTP 401/403)"}
        return {"status": "error", "connected": False, "username": "", "detail": f"Hugging Face HTTP {e.code}"}
    except Exception as ex:
        return {"status": "error", "connected": False, "username": "", "detail": f"Connection check failed: {str(ex)}"}

@router.put("/currency")
def set_currency(body: CurrencyUpdate):
    global _user_currency_override
    _user_currency_override = body.currency
    return {"status": "ok", "currency": body.currency}

@router.put("/hf_token")
def set_hf_token(body: HfTokenUpdate):
    token = body.token.strip()
    os.environ["HF_API_TOKEN"] = token
    os.environ["HF_TOKEN"] = token
    # Also return the live verification status
    verify_res = _verify_hf_token_direct(token)
    return {"status": "ok", "verification": verify_res}

@router.get("/hf_token")
def get_hf_token():
    return {"token": os.environ.get("HF_API_TOKEN", os.environ.get("HF_TOKEN", ""))}

@router.post("/hf_token/verify", response_model=HfTokenStatusResponse)
def verify_hf_token(body: HfTokenUpdate):
    """Verify any passed token against Hugging Face API."""
    res = _verify_hf_token_direct(body.token)
    return HfTokenStatusResponse(**res)

@router.get("/hf_token/status", response_model=HfTokenStatusResponse)
def get_current_hf_token_status():
    """Verify currently configured environment token."""
    cur_token = os.environ.get("HF_API_TOKEN", os.environ.get("HF_TOKEN", ""))
    res = _verify_hf_token_direct(cur_token)
    return HfTokenStatusResponse(**res)

@router.get("/currency", response_model=CurrencyResponse)
def get_currency(request: Request):
    global _user_currency_override
    client_ip = request.client.host if request.client else "127.0.0.1"

    # If user has manually set a currency, return that
    if _user_currency_override:
        return CurrencyResponse(
            currency=_user_currency_override,
            country="User Override",
            ip=client_ip
        )

    try:
        test_ip = "" if client_ip in ["127.0.0.1", "::1", "localhost"] else client_ip
        url = f"https://ipapi.co/{test_ip}/json/" if test_ip else "https://ipapi.co/json/"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode())
            # Default to INR if currency from IP is undefined or empty
            return CurrencyResponse(
                currency=data.get("currency", "INR") or "INR",
                country=data.get("country_name", "India"),
                ip=data.get("ip", client_ip)
            )
    except Exception:
        # Default is ALWAYS INR (Rupees)
        return CurrencyResponse(
            currency="INR",
            country="India (Default)",
            ip=client_ip
        )

