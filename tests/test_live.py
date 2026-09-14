"""Test en live du backend FastAPI."""
import urllib.request
import urllib.error
import json

BASE = "http://localhost:8000"
TOKEN = None

print("=" * 60)
print("  TEST LIVE BACKEND - AssistantJuridique MALI")
print("=" * 60)

# ===== TEST 1: Root endpoint =====
print("\n[1/5] Ping root endpoint...")
try:
    req = urllib.request.urlopen(f"{BASE}/", timeout=5)
    data = json.loads(req.read())
    print(f"  OK  {data}")
except urllib.error.URLError as e:
    print(f"  ERREUR CONNEXION: {e.reason}")
    print("  -> Le backend n'est pas accessible sur http://localhost:8000")
    print("  -> Verifiez que uvicorn tourne bien (uvicorn app.main:app --reload)")
    exit(1)
except Exception as e:
    print(f"  ERREUR: {e}")
    exit(1)

# ===== TEST 2: Login admin =====
print("\n[2/5] Test login admin...")
try:
    payload = json.dumps({"email": "fayesidi86@gmail.com", "password": "faye5fayeS"}).encode()
    req = urllib.request.Request(
        f"{BASE}/api/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req, timeout=10)
    data = json.loads(res.read())
    TOKEN = data.get("access_token", "")
    user = data.get("user", {})
    print(f"  OK  Connecte en tant que: {user.get('email')} (admin={user.get('is_admin')})")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"  ERREUR HTTP {e.code}: {body}")
except Exception as e:
    print(f"  ERREUR: {e}")

# ===== TEST 3: /me =====
print("\n[3/5] Test GET /api/auth/me...")
if TOKEN:
    try:
        req = urllib.request.Request(
            f"{BASE}/api/auth/me",
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        res = urllib.request.urlopen(req, timeout=5)
        me = json.loads(res.read())
        print(f"  OK  Profil: {me}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ERREUR HTTP {e.code}: {body}")
    except Exception as e:
        print(f"  ERREUR: {e}")
else:
    print("  IGNORE (pas de token)")

# ===== TEST 4: Admin documents =====
print("\n[4/5] Test GET /api/admin/documents (liste des docs en BDD)...")
if TOKEN:
    try:
        req = urllib.request.Request(
            f"{BASE}/api/admin/documents",
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        res = urllib.request.urlopen(req, timeout=10)
        docs = json.loads(res.read())
        if docs:
            print(f"  OK  {len(docs)} document(s) trouve(s) en base:")
            for d in docs:
                print(f"       - [{d['id']}] {d['title']} ({d['chunk_count']} chunks)")
        else:
            print("  OK  Aucun document en base de donnees.")
            print("  INFO: Le chat repondra 'aucun texte trouve' sans documents charges")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ERREUR HTTP {e.code}: {body}")
    except Exception as e:
        print(f"  ERREUR: {e}")
else:
    print("  IGNORE (pas de token)")

# ===== TEST 5: Chat /ask =====
print("\n[5/5] Test POST /api/chat/ask...")
if TOKEN:
    try:
        chat_payload = json.dumps({"question": "Quels sont les droits fondamentaux au Mali?"}).encode()
        req = urllib.request.Request(
            f"{BASE}/api/chat/ask",
            data=chat_payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {TOKEN}"
            }
        )
        res = urllib.request.urlopen(req, timeout=60)
        chat_data = json.loads(res.read())
        answer = chat_data.get("answer", "")
        sources = chat_data.get("sources", [])
        print(f"  OK  Reponse recue ({len(answer)} chars)")
        print(f"       Debut: {answer[:150]}...")
        print(f"       Sources: {len(sources)} source(s)")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ERREUR HTTP {e.code}: {body}")
        print("  -> Cause probable: cle API Gemini invalide ou pas de document charge")
    except urllib.error.URLError as e:
        print(f"  ERREUR CONNEXION: {e.reason}")
    except Exception as e:
        print(f"  ERREUR: {type(e).__name__}: {e}")
else:
    print("  IGNORE (pas de token)")

print("\n" + "=" * 60)
print("  FIN DES TESTS LIVE")
print("=" * 60)
