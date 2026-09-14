"""Point d'entrée de l'application FastAPI AssistantJuridique MALI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import admin, auth, chat
from app.core.database import Base, engine

app = FastAPI(
    title="AssistantJuridique MALI",
    description=(
        "API pour l'assistant juridique intelligent "
        "basé sur les textes de loi du Mali"
    ),
    version="1.0.0",
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(admin.router)


@app.on_event("startup")
def on_startup():
    """Initialise l'extension pgvector et crée les tables au démarrage."""
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(bind=engine)

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


@app.get("/")
def root():
    """Route racine de vérification du statut de l'API."""
    return {
        "message": "AssistantJuridique MALI API",
        "version": "1.0.0",
        "status": "running",
    }
