from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from database import save_test_case, list_test_cases
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

import os

# Choix du provider: "gemini" (par défaut) ou "ollama"
PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()
if PROVIDER == "ollama":
    from llm_service import generate_test_case_ollama as _generate
else:
    from gemini_service import generate_test_case_with_gemini as _generate

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # si tu veux restreindre: ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TestRequest(BaseModel):
    code: str = Field(min_length=1)
    test_type: str = Field(pattern="^(unit|rest-assured|selenium)$", default="rest-assured")
    language: str = Field(pattern="^(java|python|javascript|typescript|csharp|ruby|go)$", default="java")

class TestResponse(BaseModel):
    code: str
    result: str
    test_type: str
    language: str

@app.get("/health")
def health():
    return {"status": "UP", "provider": PROVIDER}

@app.post("/generate-test", response_model=TestResponse)
def generate_test(data: TestRequest):
    try:
        # Génération
        result = _generate(data.code, data.test_type, data.language)

        # Sauvegarde Mongo
        save_test_case(data.code, result, data.test_type, data.language)

        return {
            "code": data.code,
            "result": result,
            "test_type": data.test_type,
            "language": data.language
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test-cases")
def get_test_cases(limit: int = Query(50, ge=1, le=200)):
    try:
        items = list_test_cases(limit=limit)
        # Sécurise la sérialisation (datetime, etc.)
        return JSONResponse(content=jsonable_encoder(items))
    except Exception as e:
        # Log utile pendant le dev
        print("ERROR /test-cases:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))