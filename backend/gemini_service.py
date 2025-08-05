import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("Clé API Google manquante dans .env")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")

def generate_test_case_with_gemini(code: str, test_type: str) -> str:
    prompt = f"""Tu es un expert en automatisation des tests logiciels.

Je travaille surla de génération automatique de cas de test à partir du code source Java.

Je vais te fournir un extrait de code Java.

Ton objectif est de générer un cas de test complet, selon le type suivant : {test_type}

Règles :
1. Si le type est 'rest-assured' :
   - Si le code n’est pas une API, crée un contrôleur REST Spring Boot minimal pour l’exposer.
   - Ensuite, génère un test Rest-Assured complet avec requête, assertions et dépendances nécessaires.

2. Si le type est 'unit' :
   - Génère un test unitaire JUnit 5 autonome, clair et avec plusieurs cas (positif, négatif, limites).
   - Utilise @Test, assertEquals, assertTrue, etc.

3. Si le type est 'selenium' :
   - Considère que le code concerne une interface utilisateur.
   - Génère un script Selenium WebDriver en Java avec ChromeDriver.
   - Simule une interaction utilisateur complète (remplir formulaire, cliquer, valider).

Contraintes :
- Fournis uniquement le code Java de test final, sans explication ni commentaire.
- Le code doit être exécutable tel quel.
- Tous les imports nécessaires doivent être inclus.

Voici le code à tester : {code}"""
    response = model.generate_content(prompt)
    return response.text


