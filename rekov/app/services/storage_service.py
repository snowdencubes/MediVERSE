import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Failed to init storage supabase client: {e}")

def upload_receipt(file_path: str, bucket_name: str, destination_path: str) -> str | None:
    """Uploads a PDF receipt to a Supabase bucket and returns the public URL."""
    if not supabase:
        print("Supabase client not initialized, skipping upload.")
        return None

    try:
        with open(file_path, "rb") as f:
            supabase.storage.from_(bucket_name).upload(
                path=destination_path,
                file=f,
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )
        
        # Get public URL
        url = supabase.storage.from_(bucket_name).get_public_url(destination_path)
        return url
    except Exception as e:
        print(f"Failed to upload receipt to Supabase: {e}")
        return None
