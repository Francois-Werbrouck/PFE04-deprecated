# database.py
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client[ os.getenv("MONGO_DB", "llm_tests") ]
collection = db["test_cases"]

def _to_dict(doc):
    if not doc: return {}
    out = dict(doc)
    if isinstance(out.get("_id"), ObjectId):
        out["_id"] = str(out["_id"])
    if isinstance(out.get("created_at"), datetime):
        out["created_at"] = out["created_at"].isoformat()
    return out

def save_test_case(code, result, test_type, language=None):
    collection.insert_one({
        "code": code,
        "generated_test": result,
        "test_type": test_type,
        "language": language,
        "created_at": datetime.utcnow()
    })

def list_test_cases(limit: int = 50):
    cur = collection.find().sort("created_at", -1).limit(int(limit))
    return [_to_dict(doc) for doc in cur]
