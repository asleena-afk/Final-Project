import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
