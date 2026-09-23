import os
import json
from pathlib import Path
from typing import Optional, Any

def _get_config_candidates():
    return [
        Path(__file__).resolve().parent.parent.parent.parent / "config.json",  # workspace root
        Path(__file__).resolve().parent.parent.parent / "config.json",         # rekov/config.json
        Path(os.getcwd()) / "config.json",
    ]

def _load_config():
    # Search locations for config.json
    candidates = _get_config_candidates()
    data = {}
    loaded_from = None
    for c in candidates:
        if c.is_file():
            try:
                with open(c, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    loaded_from = str(c)
                    break
            except Exception:
                pass

    # Extract Supabase credentials (from config.json with hardcoded fallback)
    sb = data.get("supabase", {}) if isinstance(data.get("supabase"), dict) else {}
    sb_url = (
        sb.get("url")
        or data.get("SUPABASE_URL")
        or "https://ylzpjtzeetnvypvikiqa.supabase.co"
    )
    sb_key = (
        sb.get("key")
        or data.get("SUPABASE_KEY")
        or "sb_publishable_mvS1x5C11_f5uIC9mpGukA_7vsP1jDQ"
    )

    # Extract Hugging Face token (from config.json with fallback)
    hf_token = (
        data.get("hf_token")
        or data.get("HF_TOKEN")
        or data.get("HF_API_TOKEN")
        or data.get("HUGGINGFACE_API_KEY")
        or os.environ.get("HF_TOKEN")
        or os.environ.get("HF_API_TOKEN")
        or os.environ.get("HUGGINGFACE_API_KEY")
        or ""
    )

    # Export to environment variables for full backward compatibility
    os.environ["SUPABASE_URL"] = sb_url
    os.environ["SUPABASE_KEY"] = sb_key
    if hf_token:
        os.environ["HF_TOKEN"] = hf_token
        os.environ["HF_API_TOKEN"] = hf_token
        os.environ["HUGGINGFACE_API_KEY"] = hf_token

    return sb_url, sb_key, hf_token, data, loaded_from


SUPABASE_URL, SUPABASE_KEY, HF_TOKEN, CONFIG_DATA, CONFIG_PATH = _load_config()


def save_config_key(key: str, value: Any) -> bool:
    """Save a key/value pair back to config.json and update runtime settings & env."""
    global settings
    candidates = _get_config_candidates()
    written = False
    for p in candidates:
        try:
            curr = {}
            if p.is_file():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        curr = json.load(f)
                except Exception:
                    curr = {}
            curr[key] = value
            if key == "hf_token":
                curr["HF_TOKEN"] = value
            with open(p, "w", encoding="utf-8") as f:
                json.dump(curr, f, indent=2)
            written = True
        except Exception:
            pass

    # Update runtime settings and environment variables
    settings.CONFIG[key] = value
    if key in ("hf_token", "HF_TOKEN", "HF_API_TOKEN"):
        settings.HF_TOKEN = value
        os.environ["HF_TOKEN"] = value
        os.environ["HF_API_TOKEN"] = value
        os.environ["HUGGINGFACE_API_KEY"] = value

    return written


class Settings:
    PROJECT_NAME: str = "rekov API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://rekov.onrender.com",
        "*",
    ]
    SUPABASE_URL: str = SUPABASE_URL
    SUPABASE_KEY: str = SUPABASE_KEY
    HF_TOKEN: str = HF_TOKEN
    CONFIG: dict = CONFIG_DATA
    CONFIG_PATH: Optional[str] = CONFIG_PATH


settings = Settings()
