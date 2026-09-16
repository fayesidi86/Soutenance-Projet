import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import admin, auth, chat
from app.core.config import settings
from app.core.database import Base, engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise l'extension pgvector, crée les dossiers requis et initialise l'admin."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                conn.commit()
                print("Extension pgvector initialisée.")
            except Exception as ext_err:
                print(f"Note pgvector: {ext_err}")
        Base.metadata.create_all(bind=engine)
        print("Tables de base de données créées/vérifiées avec succès.")
    except Exception as db_err:
        print(f"Erreur lors de l'initialisation des tables : {db_err}")

    # Création ou mise à jour de l'administrateur par défaut
    from app.core.database import SessionLocal
    from app.models.models import User
    from app.core.security import get_password_hash

    db = SessionLocal()
    try:
        admin_email = "fayesidi86@gmail.com"
        admin_password = "faye5fayeS"
        hashed_pw = get_password_hash(admin_password)

        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                hashed_password=hashed_pw,
                full_name="Administrateur",
                is_admin=True,
            )
            db.add(admin_user)
            db.commit()
            print(f"Administrateur par défaut ({admin_email}) créé avec succès.")
        else:
            admin_user.hashed_password = hashed_pw
            admin_user.is_admin = True
            db.commit()
            print(f"Administrateur par défaut ({admin_email}) mis à jour avec succès.")
    except Exception as e:
        db.rollback()
        print(f"Erreur lors de la création de l'administrateur : {e}")
    finally:
        db.close()

    yield  # L'application tourne ici


app = FastAPI(
    title="AssistantJuridique MALI",
    description=(
        "API pour l'assistant juridique intelligent "
        "basé sur les textes de loi du Mali"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Configuration CORS (Support local et déploiement Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(admin.router)



@app.get("/")
def root():
    """Route racine de vérification du statut de l'API."""
    return {
        "message": "AssistantJuridique MALI API",
        "version": "1.0.0",
        "status": "running",
    }
