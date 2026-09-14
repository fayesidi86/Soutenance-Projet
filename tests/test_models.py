"""Lister tous les modeles Gemini disponibles avec la cle API."""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.core.config import settings
import google.generativeai as genai

genai.configure(api_key=settings.GEMINI_API_KEY)

print("=== MODELES GEMINI DISPONIBLES ===\n")
models_generate = []
models_embed = []

for m in genai.list_models():
    methods = list(m.supported_generation_methods)
    if "generateContent" in methods:
        models_generate.append(m.name)
    if "embedContent" in methods:
        models_embed.append(m.name)

print("--- Pour generateContent (LLM) ---")
for name in sorted(models_generate):
    print(f"  {name}")

print("\n--- Pour embedContent (Embedding) ---")
for name in sorted(models_embed):
    print(f"  {name}")

print("\n=== TEST RAPIDE AVEC gemini-2.5-flash ===")
try:
    model = genai.GenerativeModel("gemini-2.5-flash")
    r = model.generate_content("Dis bonjour en 5 mots.")
    print(f"  OK: {r.text.strip()[:80]}")
except Exception as e:
    print(f"  ERREUR: {e}")

print("\n=== TEST RAPIDE AVEC gemini-1.5-flash-latest ===")
try:
    model = genai.GenerativeModel("gemini-1.5-flash-latest")
    r = model.generate_content("Dis bonjour en 5 mots.")
    print(f"  OK: {r.text.strip()[:80]}")
except Exception as e:
    print(f"  ERREUR: {e}")
