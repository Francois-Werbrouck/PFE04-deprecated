# database.py
from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
from bson import ObjectId
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "llm_tests")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db["test_cases"]

# --- Indexes (idempotent) ---
# - tri par date
# - filtres rapides (status/type/lang/provider/model)
# - recherche texte (title, code, generated_test)
collection.create_index([("created_at", DESCENDING)])
collection.create_index([("status", ASCENDING), ("test_type", ASCENDING), ("language", ASCENDING)])
collection.create_index([("provider", ASCENDING), ("model", ASCENDING)])
try:
    collection.create_index([("title", TEXT), ("code", TEXT), ("generated_test", TEXT)], name="text_search")
except Exception:
    # Certains environnements peuvent restreindre la création d'index TEXT plusieurs fois, on ignore si déjà existant
    pass


def _to_dict(doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Convertit un document Mongo en dict JSON-safe."""
    if not doc:
        return {}
    out = dict(doc)
    if isinstance(out.get("_id"), ObjectId):
        out["_id"] = str(out["_id"])
    for k in ("created_at", "updated_at"):
        if isinstance(out.get(k), datetime):
            out[k] = out[k].isoformat()
    return out


def insert_test_case(
    *,
    code: str,
    generated_test: str,
    test_type: str,
    language: Optional[str] = None,
    status: str = "confirmed",
    provider: Optional[str] = None,
    model: Optional[str] = None,
    title: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> Dict[str, Any]:
    doc = {
        "code": code,
        "generated_test": generated_test,
        "test_type": test_type,
        "language": language,
        "status": status,  # "draft" ou "confirmed"
        "provider": provider,
        "model": model,
        "title": title,
        "tags": tags or [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    res = collection.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return _to_dict(doc)


def get_test_case(case_id: str) -> Optional[Dict[str, Any]]:
    try:
        doc = collection.find_one({"_id": ObjectId(case_id)})
        return _to_dict(doc) if doc else None
    except Exception:
        return None


def update_test_case(case_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # champs autorisés à la mise à jour
    allowed = {
        "code", "generated_test", "test_type", "language",
        "status", "provider", "model", "title", "tags"
    }
    to_set = {k: v for k, v in updates.items() if k in allowed}
    if not to_set:
        return get_test_case(case_id)
    to_set["updated_at"] = datetime.utcnow()
    try:
        res = collection.find_one_and_update(
            {"_id": ObjectId(case_id)},
            {"$set": to_set},
            return_document=True  # type: ignore[arg-type]
        )
        return _to_dict(res) if res else None
    except Exception:
        return None


def delete_test_case(case_id: str) -> bool:
    try:
        res = collection.delete_one({"_id": ObjectId(case_id)})
        return res.deleted_count == 1
    except Exception:
        return False


def list_test_cases(
    *,
    limit: int = 50,
    sort_by: str = "created_at",
    sort_dir: int = -1,
    test_type: Optional[str] = None,
    language: Optional[str] = None,
    status: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    contains: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {}

    if test_type:
        query["test_type"] = test_type
    if language:
        query["language"] = language
    if status:
        query["status"] = status
    if provider:
        query["provider"] = provider
    if model:
        query["model"] = model

    if date_from or date_to:
        query["created_at"] = {}
        if date_from:
            query["created_at"]["$gte"] = date_from
        if date_to:
            query["created_at"]["$lte"] = date_to

    cursor = None
    # Recherche texte si possible
    if contains:
        try:
            cursor = collection.find({"$text": {"$search": contains}, **query})
        except Exception:
            # Fallback regex basique (moins performant)
            regex = {"$regex": contains, "$options": "i"}
            text_or = {"$or": [{"title": regex}, {"code": regex}, {"generated_test": regex}]}
            cursor = collection.find({**query, **text_or})
    else:
        cursor = collection.find(query)

    sort_dir_val = DESCENDING if sort_dir == -1 else ASCENDING
    cursor = cursor.sort(sort_by, sort_dir_val).limit(int(limit))
    return [_to_dict(doc) for doc in cursor]
