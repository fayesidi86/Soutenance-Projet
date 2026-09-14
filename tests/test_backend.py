"""Script de test du backend AssistantJuridique MALI."""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

errors = []
warnings = []

print("=" * 60)
print("  TEST BACKEND - AssistantJuridique MALI")
print("=" * 60)

# ===== TEST 1: Config =====
print("\n[1/7] Config (settings)...")
try:
    from app.core.config import settings
    print(f"  OK  DATABASE_URL     : {settings.DATABASE_URL[:45]}...")
    if not settings.GEMINI_API_KEY:
        warnings.append("GEMINI_API_KEY est vide dans .env")
        print("  WARN GEMINI_API_KEY  : VIDE")
    else:
        print(f"  OK  GEMINI_API_KEY   : {settings.GEMINI_API_KEY[:20]}...")
    print(f"  OK  EMBEDDING_MODEL  : {settings.EMBEDDING_MODEL}")
    print(f"  OK  LLM_MODEL        : {settings.LLM_MODEL}")
    print(f"  OK  UPLOAD_DIR       : {settings.UPLOAD_DIR}")
except Exception as e:
    errors.append(f"Config: {e}")
    print(f"  ERREUR: {e}")

# ===== TEST 2: Database =====
print("\n[2/7] Database (SQLAlchemy)...")
try:
    from app.core.database import Base, engine, SessionLocal, get_db
    print("  OK  Modules database importés")
except Exception as e:
    errors.append(f"Database import: {e}")
    print(f"  ERREUR import: {e}")

# ===== TEST 3: Models =====
print("\n[3/7] Models (SQLAlchemy ORM)...")
try:
    from app.models.models import User, Document, DocumentChunk
    print("  OK  User, Document, DocumentChunk importés")
    # Check Vector dimension
    vec_col = DocumentChunk.__table__.c.embedding
    print(f"  OK  Vector embedding dimension: {vec_col.type.dim}")
    if vec_col.type.dim != 768:
        warnings.append(f"Dimension Vector = {vec_col.type.dim} (attendu 768 pour gemini-embedding-001)")
except Exception as e:
    errors.append(f"Models: {e}")
    print(f"  ERREUR: {e}")

# ===== TEST 4: Security =====
print("\n[4/7] Security (JWT + bcrypt)...")
try:
    from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
    h = get_password_hash("test123")
    assert verify_password("test123", h), "verify_password failed"
    assert not verify_password("wrong", h), "verify_password should fail for wrong pw"
    token = create_access_token({"sub": "42"})
    payload = decode_access_token(token)
    assert payload is not None, "decode_access_token returned None"
    assert payload.get("sub") == "42", "Token sub mismatch"
    print("  OK  bcrypt hash/verify")
    print("  OK  JWT create/decode")
except Exception as e:
    errors.append(f"Security: {e}")
    print(f"  ERREUR: {e}")

# ===== TEST 5: PDF Service =====
print("\n[5/7] PDF Service...")
try:
    from app.services.pdf_service import extract_text_from_pdf, chunk_legal_text, _split_long_text
    # Test chunk_legal_text avec texte fictif contenant des articles
    sample_text = """
Article 1 - Dispositions générales
Les présentes dispositions s'appliquent à tous les citoyens maliens.
Toute personne est égale devant la loi.

Article 2 - Droits fondamentaux
Chaque citoyen a droit à la liberté et à la sécurité.
L'Etat garantit ces droits sans discrimination.

Article 3 - Obligations
Tout citoyen doit respecter les lois en vigueur.
"""
    chunks = chunk_legal_text(sample_text, "Test Doc")
    assert len(chunks) > 0, "chunk_legal_text returned empty list"
    for c in chunks:
        assert "content" in c
        assert "article_reference" in c
        assert "document_title" in c
    print(f"  OK  chunk_legal_text: {len(chunks)} chunk(s) créés")
    
    # Test fallback paragraphe
    simple_text = "Un paragraphe simple.\n\nDeuxième paragraphe.\n\nTroisième."
    chunks2 = chunk_legal_text(simple_text, "Simple")
    assert len(chunks2) > 0
    print(f"  OK  chunk fallback paragraphe: {len(chunks2)} chunk(s)")
    
    # Test _split_long_text
    long_text = "Phrase une. " * 200
    parts = _split_long_text(long_text, 500)
    assert len(parts) > 1
    print(f"  OK  _split_long_text: {len(parts)} partie(s)")
    
except Exception as e:
    errors.append(f"PDF Service: {e}")
    print(f"  ERREUR: {e}")

# ===== TEST 6: RAG Service (import seulement) =====
print("\n[6/7] RAG Service (import)...")
try:
    from app.services.rag_service import generate_embedding, store_chunk_with_embedding, search_similar_chunks, generate_legal_response
    print("  OK  Fonctions RAG importées")
    # On ne teste pas l'appel API réel (nécessite clé Gemini valide + réseau)
    print("  INFO generate_embedding / generate_legal_response: non testés (requiert API Gemini live)")
except Exception as e:
    errors.append(f"RAG Service: {e}")
    print(f"  ERREUR: {e}")

# ===== TEST 7: FastAPI App =====
print("\n[7/7] Application FastAPI...")
try:
    from app.main import app
    routes = [(r.path, list(r.methods) if hasattr(r, 'methods') and r.methods else []) for r in app.routes]
    print(f"  OK  App: '{app.title}' v{app.version}")
    print(f"  OK  Middlewares: {[type(m).__name__ for m in app.user_middleware]}")
    for path, methods in routes:
        print(f"       {methods} {path}")
except Exception as e:
    errors.append(f"FastAPI main: {e}")
    print(f"  ERREUR: {e}")

# ===== RÉSUMÉ =====
print("\n" + "=" * 60)
print("  RÉSUMÉ")
print("=" * 60)
if warnings:
    print(f"\n  AVERTISSEMENTS ({len(warnings)}):")
    for w in warnings:
        print(f"    - {w}")
if errors:
    print(f"\n  ERREURS ({len(errors)}):")
    for e in errors:
        print(f"    - {e}")
    print(f"\n  BILAN: {len(errors)} ERREUR(S) DETECTEE(S) - voir ci-dessus")
else:
    if warnings:
        print(f"\n  BILAN: Tous les imports OK mais {len(warnings)} avertissement(s)")
    else:
        print("\n  BILAN: TOUS LES TESTS OK - Backend prêt")
print("=" * 60)
