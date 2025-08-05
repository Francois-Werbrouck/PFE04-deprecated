Guide de Lancement du Prototype IA – 
Prérequis
Python 3.9+
React
npm
FastAPI
Uvicorn
Vite
Clé API OpenAI (ou Google Gemini)
Lancement du Backend (FastAPI)
1. Créer un environnement virtuel :
python -m venv venv
venv\Scripts\activate sous Windows
2. Installer les dépendances :
pip install -r requirements.txt
3. Créer un fichier `.env` avec :
API_KEY=ta_cle_api
4. Lancer le serveur :
uvicorn main:app --reload
Accès Swagger : http://localhost:8000/docs
Lancement du Frontend (React + Vite)
1. Aller dans le dossier :
cd frontend
2. Installer les dépendances :
npm install
3. Lancer le projet :
npm run dev
Interface : http://localhost:5173
Optionnel : Dockerisation
1. Créer un Dockerfile pour backend et frontend
2. Créer un docker-compose.yml
3. Lancer avec :
docker-compose up --build
Vérification finale
Swagger est accessible
L’interface s’ouvre bien en local
Les prompts sont envoyés à l’API
Les cas de test sont générés

Acces à la BDD :  https://cloud.mongodb.com/
