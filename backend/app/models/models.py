from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
# pyrefly: ignore [missing-import]
from pgvector.sqlalchemy import Vector

from app.core.database import Base


class User(Base):
    """Modèle utilisateur avec authentification, rôle admin et statut actif."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    conversations = relationship(
        "Conversation", back_populates="user", cascade="all, delete-orphan"
    )


class Document(Base):
    """Modèle pour les documents PDF juridiques uploadés."""

    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(500), nullable=False)
    title = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    uploaded_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    chunks = relationship(
        "DocumentChunk", back_populates="document", cascade="all, delete-orphan"
    )


class DocumentChunk(Base):
    """Modèle pour les fragments de documents avec embeddings vectoriels."""

    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content = Column(Text, nullable=False)
    article_reference = Column(String(255), nullable=True)
    embedding = Column(Vector(768))  # Dimension pour text-embedding-004

    document = relationship("Document", back_populates="chunks")


class Conversation(Base):
    """Modèle pour une session de discussion utilisateur."""

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False, default="Nouvelle discussion")
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user = relationship("User", back_populates="conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(Base):
    """Modèle pour un message individuel dans une conversation."""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(50), nullable=False)  # "user" ou "assistant"
    content = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)  # Stocke les métadonnées des sources (titre, article, etc.)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    conversation = relationship("Conversation", back_populates="messages")
