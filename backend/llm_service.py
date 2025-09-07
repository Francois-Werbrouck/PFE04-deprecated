import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

PROMPT_TEMPLATE = """
Tu es un expert en automatisation des tests.
Langage cible: {language}
Type de test: {test_type}

Règles:
- Code seul, sans explication ni balises.
- Imports inclus.
- Cas nominal + cas d'erreur/limite.
- Si besoin, crée des stubs réalistes.

Code:
---
{code}
---
"""

def generate_test_case_ollama(code, test_type, language):
    payload = {
        "model": "deepseek-coder:7b",
        "prompt": PROMPT_TEMPLATE.format(code=code, test_type=test_type, language=language),
        "stream": False
    }
    response = requests.post(OLLAMA_URL, json=payload)
    if response.status_code != 200:
        raise Exception("Erreur modèle LLM")
    return response.json().get("response")
