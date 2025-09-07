import os
from textwrap import dedent
from typing import Optional
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("Clé API Google manquante dans .env (GOOGLE_API_KEY)")

genai.configure(api_key=api_key)

DEFAULT_GEMINI_MODEL = os.getenv("GOOGLE_MODEL", "gemini-1.5-flash")

GOAL_BY_TYPE = {
    "unit": "Écris des tests unitaires couvrant cas nominal et cas d'erreur (limite/exception).",
    "rest-assured": "Écris des tests d'API HTTP avec requêtes et assertions (statut, en-têtes, corps).",
    "selenium": "Écris des tests E2E navigateur robustes (localisateurs stables, actions, assertions).",
}

FRAMEWORK_HINT = {
    ("java","unit"): "JUnit 5 + AssertJ",
    ("python","unit"): "pytest",
    ("javascript","unit"): "Jest",
    ("typescript","unit"): "Jest (ts-jest)",
    ("csharp","unit"): "xUnit",
    ("ruby","unit"): "RSpec",
    ("go","unit"): "testing",

    ("java","rest-assured"): "REST Assured + JUnit 5",
    ("python","rest-assured"): "requests + pytest",
    ("javascript","rest-assured"): "supertest + Jest",
    ("typescript","rest-assured"): "supertest + Jest",
    ("csharp","rest-assured"): "RestSharp + xUnit",
    ("ruby","rest-assured"): "Faraday + RSpec",
    ("go","rest-assured"): "net/http + testing",

    ("java","selenium"): "Selenium WebDriver + JUnit 5",
    ("python","selenium"): "selenium + pytest",
    ("javascript","selenium"): "selenium-webdriver + Jest",
    ("typescript","selenium"): "selenium-webdriver + Jest",
    ("csharp","selenium"): "Selenium WebDriver + xUnit",
    ("ruby","selenium"): "selenium-webdriver + RSpec",
    ("go","selenium"): "chromedp (équivalent Selenium en Go)",
}

def _build_prompt(code: str, test_type: str, language: str) -> str:
    goal = GOAL_BY_TYPE.get(test_type, "")
    hint = FRAMEWORK_HINT.get((language, test_type), "")
    return dedent(f"""
    Tu es un expert en AUTOMATISATION DE TESTS.

    Contraintes FERMES:
    - Réponds UNIQUEMENT par du CODE (aucune explication).
    - AUCUNE balise ``` ni texte hors code.
    - Inclure TOUS les imports nécessaires.
    - Au moins un cas nominal ET un cas d'erreur/limite.
    - Crée des stubs minimaux si nécessaire.

    Langage cible: {language}
    Type de test: {test_type}
    Cadre attendu: {hint}

    Code sous test:
    ---
    {code}
    ---
    """).strip()

def generate_test_case_with_gemini(code: str, test_type: str, language: str, model: Optional[str] = None) -> str:
    prompt = _build_prompt(code, test_type, language)
    model_name = model or DEFAULT_GEMINI_MODEL
    m = genai.GenerativeModel(model_name)
    out = m.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.2,
            top_p=0.9,
            candidate_count=1,
        )
    )
    text = (getattr(out, "text", "") or "").strip()
    return text.replace("```", "").strip()
