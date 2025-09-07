# backend/gemini_service.py
import os
from textwrap import dedent
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("Clé API Google manquante dans .env")

genai.configure(api_key=api_key)
_model = genai.GenerativeModel("gemini-1.5-flash")

GOAL_BY_TYPE = {
    "unit": "Écris des tests unitaires couvrant cas nominal + cas d'erreur (limite/exception).",
    "rest-assured": "Écris des tests d'API HTTP avec requêtes et assertions (statut, headers, corps).",
    "selenium": "Écris des tests E2E navigateur robustes (localisateurs stables, actions, assertions).",
}

FRAMEWORK_HINT = {
    # UNIT
    ("java","unit"): "Utilise JUnit 5 + AssertJ.",
    ("python","unit"): "Utilise pytest.",
    ("javascript","unit"): "Utilise Jest.",
    ("typescript","unit"): "Utilise Jest (ts-jest).",
    ("csharp","unit"): "Utilise xUnit.",
    ("ruby","unit"): "Utilise RSpec.",
    ("go","unit"): "Utilise testing.",
    # REST-ASSURED (API) — équivalents selon langage
    ("java","rest-assured"): "Utilise REST Assured + JUnit 5.",
    ("python","rest-assured"): "Utilise requests + pytest.",
    ("javascript","rest-assured"): "Utilise supertest + Jest.",
    ("typescript","rest-assured"): "Utilise supertest + Jest.",
    ("csharp","rest-assured"): "Utilise RestSharp + xUnit.",
    ("ruby","rest-assured"): "Utilise Faraday + RSpec.",
    ("go","rest-assured"): "Utilise net/http + testing.",
    # SELENIUM (UI)
    ("java","selenium"): "Utilise Selenium WebDriver + JUnit 5.",
    ("python","selenium"): "Utilise selenium + pytest.",
    ("javascript","selenium"): "Utilise selenium-webdriver + Jest.",
    ("typescript","selenium"): "Utilise selenium-webdriver + Jest.",
    ("csharp","selenium"): "Utilise Selenium WebDriver + xUnit.",
    ("ruby","selenium"): "Utilise selenium-webdriver + RSpec.",
    ("go","selenium"): "Utilise chromedp (équivalent Selenium en Go).",
}

def _build_prompt(code: str, test_type: str, language: str) -> str:
    goal = GOAL_BY_TYPE.get(test_type, "")
    hint = FRAMEWORK_HINT.get((language, test_type), "")
    return dedent(f"""
    Tu es un expert en automatisation des tests.

    Langage cible: {language}
    Type de test: {test_type}
    {goal}
    {hint}

    Règles:
    - Réponds UNIQUEMENT avec le code du test, sans explication ni balises ``` .
    - Inclue tous les imports nécessaires.
    - Donne des noms de classes/fonctions pertinents.
    - Fournis au moins un cas nominal et un cas d'erreur/limite.
    - Si l'entrée n'est pas suffisante (ex.: pas d'API exposée), crée un stub minimal réaliste.

    Code source à tester:
    ---
    {code}
    ---
    """).strip()

def generate_test_case_with_gemini(code: str, test_type: str, language: str) -> str:
    prompt = _build_prompt(code, test_type, language)
    out = _model.generate_content(prompt)
    text = (out.text or "").strip()
    return text.replace("```", "").strip()
