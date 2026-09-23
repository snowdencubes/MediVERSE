import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

from app.core.config import settings

import json

def get_supabase_client() -> Client | None:
    url = os.environ.get("SUPABASE_URL") or settings.SUPABASE_URL
    key = os.environ.get("SUPABASE_KEY") or settings.SUPABASE_KEY
    if not (url and key):
        for cfg_path in [os.path.join(ROOT_DIR, "config.json"), os.path.join(ROOT_DIR, "rekov", "config.json")]:
            if os.path.isfile(cfg_path):
                try:
                    with open(cfg_path, "r", encoding="utf-8") as f:
                        cfg_data = json.load(f)
                        sb = cfg_data.get("supabase", {}) if isinstance(cfg_data.get("supabase"), dict) else {}
                        url = url or sb.get("url") or cfg_data.get("SUPABASE_URL")
                        key = key or sb.get("key") or cfg_data.get("SUPABASE_KEY")
                        if url and key:
                            os.environ["SUPABASE_URL"] = url
                            os.environ["SUPABASE_KEY"] = key
                            break
                except Exception:
                    pass
    if url and key:
        try:
            return create_client(url, key)
        except Exception as e:
            print(f"Failed to init storage supabase client: {e}")
    return None

def upload_receipt(file_path: str, bucket_name: str, destination_path: str) -> str | None:
    """Uploads a PDF receipt to a Supabase bucket and returns the public URL.
    """
    client = get_supabase_client()
    if not client:
        print("[RECEIPT STORAGE] Supabase client not initialized — PDF saved locally only.")
        return None

    try:
        content_type = "application/pdf" if file_path.endswith(".pdf") else "image/png" if file_path.endswith(".png") else "application/octet-stream"
        with open(file_path, "rb") as f:
            client.storage.from_(bucket_name).upload(
                path=destination_path,
                file=f,
                file_options={"content-type": content_type, "upsert": "true"}
            )
        url = client.storage.from_(bucket_name).get_public_url(destination_path)
        print(f"[RECEIPT STORAGE] OK  -> {url}")
        return url
    except Exception as e:
        print(f"[RECEIPT STORAGE] FAIL: {e}")
        return None
