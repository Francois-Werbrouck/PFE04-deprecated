from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from database import save_test_case
from gemini_service import generate_test_case_with_gemini as generate_test_case
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TestRequest(BaseModel):
    code: str
    test_type: str = "rest-assured"

class TestResponse(BaseModel):
    code: str
    result: str

@app.post("/generate-test", response_model=TestResponse)
def generate_test(data: TestRequest):
    try:
        result = generate_test_case(data.code, data.test_type)
        save_test_case(data.code, result, data.test_type)
        return {"code": data.code, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
