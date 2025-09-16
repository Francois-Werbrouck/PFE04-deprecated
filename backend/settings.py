from dotenv import load_dotenv
import os
load_dotenv()

def _bool(s: str, default=False):
    if s is None: return default
    return s.strip().lower() in ("1","true","yes","on")

class Settings:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB = os.getenv("MONGO_DB", "llm_tests")

    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()
    OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-coder:1.3b")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
    GOOGLE_MODEL = os.getenv("GOOGLE_MODEL", "gemini-1.5-flash")

    AUTH_ENABLED = _bool(os.getenv("AUTH_ENABLED"), False)
    JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_change_me")
    JWT_ALG = os.getenv("JWT_ALG", "HS256")
    JWT_ACCESS_TTL_MIN = int(os.getenv("JWT_ACCESS_TTL_MIN", "30"))
    JWT_REFRESH_TTL_DAYS = int(os.getenv("JWT_REFRESH_TTL_DAYS", "7"))

    CORS_ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS","").split(",") if o.strip()]

    MAX_REQ_BODY_KB = int(os.getenv("MAX_REQ_BODY_KB", "256"))
    GEN_TIMEOUT = int(os.getenv("GEN_TIMEOUT", "90"))
    MAX_GENERATE_PER_MIN = int(os.getenv("MAX_GENERATE_PER_MIN","60"))

settings = Settings()
