import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

PROMPT_TEMPLATE = """
Génère un test {test_type} pour ce code :
{code}
"""

def generate_test_case(code, test_type):
    payload = {
        "model": "deepseek-coder:7b",
        "prompt": PROMPT_TEMPLATE.format(code=code, test_type=test_type),
        "stream": False
    }
    response = requests.post(OLLAMA_URL, json=payload)
    if response.status_code != 200:
        raise Exception("Erreur modèle LLM")
    return response.json().get("response")
