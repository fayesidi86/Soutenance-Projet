"""Diagnostic precis de l'erreur 500 sur /api/chat/ask."""
import urllib.request
import urllib.error
import json

BASE = "http://localhost:8000"

# Login
payload = json.dumps({"email": "fayesidi86@gmail.com", "password": "faye5fayeS"}).encode()
req = urllib.request.Request(f"{BASE}/api/auth/login", data=payload, headers={"Content-Type": "application/json"})
res = urllib.request.urlopen(req, timeout=10)
TOKEN = json.loads(res.read())["access_token"]

print("=== DIAGNOSTIC ERREUR 500 sur /api/chat/ask ===\n")

# Test avec question simple
chat_payload = json.dumps({"question": "test"}).encode()
req = urllib.request.Request(
    f"{BASE}/api/chat/ask",
    data=chat_payload,
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"}
)
try:
    res = urllib.request.urlopen(req, timeout=60)
    print("SUCCES:", json.loads(res.read()))
except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8", errors="replace")
    print(f"HTTP {e.code} {e.reason}")
    print(f"Body complet:\n{body}")
    
    # Parse detail si JSON
    try:
        parsed = json.loads(body)
        print(f"\nDetail: {parsed.get('detail', 'N/A')}")
    except Exception:
        pass
except Exception as e:
    print(f"Autre erreur: {type(e).__name__}: {e}")

# Verifier aussi la cle API Gemini directement
print("\n=== TEST CLE API GEMINI ===")
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.core.config import settings
print(f"GEMINI_API_KEY dans config: {settings.GEMINI_API_KEY[:25]}...")
print(f"EMBEDDING_MODEL: {settings.EMBEDDING_MODEL}")

import google.generativeai as genai
genai.configure(api_key=settings.GEMINI_API_KEY)

print("\nTest generate_embedding...")
try:
    result = genai.embed_content(
        model=settings.EMBEDDING_MODEL,
        content="test juridique",
        output_dimensionality=768,
    )
    emb = result["embedding"]
    print(f"  OK: embedding dimension = {len(emb)}")
except Exception as e:
    print(f"  ERREUR embedding: {type(e).__name__}: {e}")

print("\nTest LLM Gemini...")
try:
    model = genai.GenerativeModel(settings.LLM_MODEL)
    response = model.generate_content("Dis bonjour en 5 mots.")
    print(f"  OK: {response.text[:100]}")
except Exception as e:
    print(f"  ERREUR LLM: {type(e).__name__}: {e}")
