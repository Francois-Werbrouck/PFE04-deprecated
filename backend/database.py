from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["llm_tests"]
collection = db["test_cases"]

def save_test_case(code, result, test_type):
    doc = {
        "code": code,
        "generated_test": result,
        "test_type": test_type
    }
    collection.insert_one(doc)
