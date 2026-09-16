import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Configuration de l'application AssistantJuridique MALI."""

    DATABASE_URL: str = "postgresql://postgres:faye@localhost:5432/assistant_juridique"
    SECRET_KEY: str = "faye"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    GEMINI_API_KEY: str = ""
    EMBEDDING_MODEL: str = "gemini-embedding-001"
    LLM_MODEL: str = "gemini-3.6-flash"
    UPLOAD_DIR: str = "uploads"
    GOOGLE_CLIENT_ID: str = ""

    # === Notifications Email (Connexion / Alertes) ===
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True
    ADMIN_NOTIFICATION_EMAIL: str = "fayesidi86@gmail.com"
    EMAIL_NOTIFICATIONS_ENABLED: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()