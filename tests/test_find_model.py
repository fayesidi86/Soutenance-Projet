"""Trouver le premier modele LLM qui repond vraiment."""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.core.config import settings
import google.generativeai as genai

genai.configure(api_key=settings.GEMINI_API_KEY)

# Candidats prioritaires (rapides et stables)
candidates = [
    "models/gemini-flash-latest",
    "models/gemini-pro-latest",
    "models/gemini-flash-lite-latest",
    "models/gemini-3.5-flash",
    "models/gemini-3.1-flash-lite",
    "models/gemini-3.1-flash-lite-preview",
]

print("=== TEST MODELES LLM ===\n")
working = None
for name in candidates:
    try:
        model = genai.GenerativeModel(name)
        r = model.generate_content("Réponds en une phrase : qu'est-ce que le droit malien ?")
        text = r.text.strip()[:80]
        print(f"  OK [{name}]: {text}")
        if working is None:
            working = name
    except Exception as e:
        err = str(e)[:80]
        print(f"  ERREUR [{name}]: {err}")

print()
if working:
    print(f"==> MODELE RECOMMANDE: {working}")
    print(f"    Mets dans .env: LLM_MODEL={working.replace('models/', '')}")
else:
    print("==> Aucun modele candidat ne fonctionne!")
