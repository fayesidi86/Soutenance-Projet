from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Conversion propre de l'URL pour éviter les problèmes d'encodage Windows / Psycopg2
db_url = str(settings.DATABASE_URL)

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    client_encoding="utf8"
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Générateur de session de base de données pour l'injection de dépendances FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()