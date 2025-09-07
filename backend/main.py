# main.py
from fastapi import FastAPI, HTTPException, Query, Path
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import os
import logging

from database import (
    insert_test_case,
    list_test_cases,
    get_test_case,
    update_test_case,
    delete_test_case,
)

# Provider config par défaut (env)
PROVIDER_DEFAULT = os.getenv("LLM_PROVIDER", "gemini").lower()
MODEL_DEFAULT = os.getenv("GOOGLE_MODEL", "gemini-1.5-flash")

# Sélecteur dynamique de provider
def _select_generator(provider: str):
    if provider == "ollama":
        from llm_service import generate_test_case_ollama as _gen
        return _gen
    # fallback gemini
    from gemini_service import generate_test_case_with_gemini as _gen
    return _gen

app = FastAPI(title="IA Test Automatisation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Pour prod: restreindre (ex: ["https://ton-domaine"])
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")


# --------- SCHEMAS ---------
class TestRequest(BaseModel):
    code: str = Field(min_length=1)
    test_type: Literal["unit", "rest-assured", "selenium"] = "rest-assured"
    language: Literal["java","python","javascript","typescript","csharp","ruby","go"] = "java"

class TestResponse(BaseModel):
    code: str
    result: str
    test_type: str
    language: str
    provider: Optional[str] = None
    model: Optional[str] = None
    status: Optional[str] = None
    id: Optional[str] = Field(default=None, alias="_id")

class GeneratePreviewRequest(TestRequest):
    provider: Optional[Literal["gemini", "ollama"]] = None
    model: Optional[str] = None  # "gemini-1.5-flash" / "deepseek-coder:7b"...

class SaveTestCaseRequest(BaseModel):
    code: str = Field(min_length=1)
    generated_test: str = Field(min_length=1)
    test_type: Literal["unit", "rest-assured", "selenium"]
    language: Optional[Literal["java","python","javascript","typescript","csharp","ruby","go"]] = "java"
    status: Literal["draft", "confirmed"] = "confirmed"
    provider: Optional[Literal["gemini", "ollama"]] = None
    model: Optional[str] = None
    title: Optional[str] = None
    tags: Optional[List[str]] = None

class UpdateTestCaseRequest(BaseModel):
    code: Optional[str] = None
    generated_test: Optional[str] = None
    test_type: Optional[Literal["unit", "rest-assured", "selenium"]] = None
    language: Optional[Literal["java","python","javascript","typescript","csharp","ruby","go"]] = None
    status: Optional[Literal["draft", "confirmed"]] = None
    provider: Optional[Literal["gemini", "ollama"]] = None
    model: Optional[str] = None
    title: Optional[str] = None
    tags: Optional[List[str]] = None


@app.get("/health")
def health():
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    if provider == "ollama":
        return {
            "status": "UP",
            "provider_default": "ollama",
            "model_default": os.getenv("OLLAMA_MODEL", "deepseek-coder:6.7b")
        }
    else:
        return {
            "status": "UP",
            "provider_default": "gemini",
            "model_default": os.getenv("GOOGLE_MODEL", "gemini-1.5-flash")
        }



# --------- COMPORTEMENT HISTORIQUE (compat) ---------
# /generate-test : génère et ENREGISTRE directement
@app.post("/generate-test", response_model=TestResponse)
def generate_and_save(data: TestRequest):
    try:
        gen = _select_generator(PROVIDER_DEFAULT)
        result = gen(data.code, data.test_type, data.language, MODEL_DEFAULT if PROVIDER_DEFAULT == "gemini" else None)
        saved = insert_test_case(
            code=data.code,
            generated_test=result,
            test_type=data.test_type,
            language=data.language,
            status="confirmed",
            provider=PROVIDER_DEFAULT,
            model=MODEL_DEFAULT if PROVIDER_DEFAULT == "gemini" else os.getenv("OLLAMA_MODEL", "deepseek-coder:7b"),
        )
        return {
            "code": saved["code"],
            "result": saved["generated_test"],
            "test_type": saved["test_type"],
            "language": saved.get("language"),
            "provider": saved.get("provider"),
            "model": saved.get("model"),
            "_id": saved.get("_id"),
            "status": saved.get("status"),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erreur /generate-test")
        raise HTTPException(status_code=500, detail=str(e))


# --------- NOUVEAU : GENERATION SANS ENREGISTREMENT ---------
@app.post("/generate-test-preview", response_model=TestResponse)
def generate_preview(data: GeneratePreviewRequest):
    try:
        provider = (data.provider or PROVIDER_DEFAULT).lower()
        model = data.model or (MODEL_DEFAULT if provider == "gemini" else os.getenv("OLLAMA_MODEL", "deepseek-coder:7b"))
        gen = _select_generator(provider)
        result = gen(data.code, data.test_type, data.language, model)
        return {
            "code": data.code,
            "result": result,
            "test_type": data.test_type,
            "language": data.language,
            "provider": provider,
            "model": model,
            "status": "draft"
        }
    except Exception as e:
        logger.exception("Erreur /generate-test-preview")
        raise HTTPException(status_code=500, detail=str(e))


# --------- NOUVEAU : CRUD TEST CASES ---------
@app.post("/test-cases", response_model=TestResponse)
def create_test_case(body: SaveTestCaseRequest):
    try:
        saved = insert_test_case(
            code=body.code,
            generated_test=body.generated_test,
            test_type=body.test_type,
            language=body.language,
            status=body.status,
            provider=(body.provider or PROVIDER_DEFAULT),
            model=body.model or (MODEL_DEFAULT if (body.provider or PROVIDER_DEFAULT) == "gemini" else os.getenv("OLLAMA_MODEL", "deepseek-coder:7b")),
            title=body.title,
            tags=body.tags,
        )
        return {
            "code": saved["code"],
            "result": saved["generated_test"],
            "test_type": saved["test_type"],
            "language": saved.get("language"),
            "provider": saved.get("provider"),
            "model": saved.get("model"),
            "_id": saved.get("_id"),
            "status": saved.get("status"),
        }
    except Exception as e:
        logger.exception("Erreur POST /test-cases")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/test-cases")
def get_test_cases(
    limit: int = Query(50, ge=1, le=200),
    test_type: Optional[str] = Query(None, pattern="^(unit|rest-assured|selenium)$"),
    language: Optional[str] = Query(None, pattern="^(java|python|javascript|typescript|csharp|ruby|go)$"),
    status: Optional[str] = Query(None, pattern="^(draft|confirmed)$"),
    provider: Optional[str] = Query(None, pattern="^(gemini|ollama)$"),
    model: Optional[str] = None,
    date_from: Optional[str] = None,  # ISO 8601
    date_to: Optional[str] = None,    # ISO 8601
    contains: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: int = Query(-1, ge=-1, le=1),
):
    try:
        df = datetime.fromisoformat(date_from) if date_from else None
        dt = datetime.fromisoformat(date_to) if date_to else None

        items = list_test_cases(
            limit=limit,
            sort_by=sort_by,
            sort_dir=sort_dir,
            test_type=test_type,
            language=language,
            status=status,
            provider=provider,
            model=model,
            date_from=df,
            date_to=dt,
            contains=contains,
        )
        return JSONResponse(content=jsonable_encoder(items))
    except Exception as e:
        logger.exception("Erreur GET /test-cases")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/test-cases/{case_id}", response_model=TestResponse)
def read_test_case(case_id: str = Path(..., min_length=10)):
    item = get_test_case(case_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "code": item["code"],
        "result": item["generated_test"],
        "test_type": item["test_type"],
        "language": item.get("language"),
        "provider": item.get("provider"),
        "model": item.get("model"),
        "_id": item.get("_id"),
        "status": item.get("status"),
    }


@app.put("/test-cases/{case_id}", response_model=TestResponse)
def edit_test_case(body: UpdateTestCaseRequest, case_id: str = Path(..., min_length=10)):
    updated = update_test_case(case_id, body.dict(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Not found or not updated")
    return {
        "code": updated["code"],
        "result": updated["generated_test"],
        "test_type": updated["test_type"],
        "language": updated.get("language"),
        "provider": updated.get("provider"),
        "model": updated.get("model"),
        "_id": updated.get("_id"),
        "status": updated.get("status"),
    }


@app.delete("/test-cases/{case_id}")
def remove_test_case(case_id: str = Path(..., min_length=10)):
    ok = delete_test_case(case_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not found or not deleted")
    return {"deleted": True}
