from fastapi import APIRouter, Request
from pydantic import BaseModel
import urllib.request
import json

router = APIRouter()

# Module-level storage for user-overridden currency
_user_currency_override: str | None = None

class CurrencyResponse(BaseModel):
    currency: str
    country: str
    ip: str

class CurrencyUpdate(BaseModel):
    currency: str

@router.put("/currency")
def set_currency(body: CurrencyUpdate):
    global _user_currency_override
    _user_currency_override = body.currency
    return {"status": "ok", "currency": body.currency}

@router.get("/currency", response_model=CurrencyResponse)
def get_currency(request: Request):
    global _user_currency_override
    client_ip = request.client.host

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
            return CurrencyResponse(
                currency=data.get("currency", "USD"),
                country=data.get("country_name", "Unknown"),
                ip=data.get("ip", client_ip)
            )
    except Exception as e:
        return CurrencyResponse(
            currency="USD",
            country="Fallback",
            ip=client_ip
        )

