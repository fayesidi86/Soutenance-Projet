"""Routes d'administration : upload de PDF, gestion des documents et utilisateurs."""

import os
import shutil
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.auth import require_admin
from app.core.config import settings
from app.core.database import get_db
from app.models.models import Document, DocumentChunk, User, Conversation, Message
from app.services.pdf_service import extract_text_from_pdf, chunk_legal_text
from app.services.rag_service import store_chunk_with_embedding

router = APIRouter(prefix="/api/admin", tags=["Administration"])


# === Schémas Pydantic ===


class DocumentResponse(BaseModel):
    id: int
    filename: str
    title: str
    uploaded_at: str
    chunk_count: int


class UserAdminResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    is_active: bool
    created_at: str
    conversation_count: int
    message_count: int


# === Routes Documents ===


@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Upload un fichier PDF de loi malienne, extrait le texte,
    le découpe en chunks et génère les embeddings vectoriels.
    Réservé aux administrateurs.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, detail="Seuls les fichiers PDF sont acceptés"
        )

    # Sauvegarde du fichier
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Enregistrement du document en BDD
    document = Document(
        filename=file.filename,
        title=title,
        file_path=file_path,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Extraction du texte et découpage en chunks
    raw_text = extract_text_from_pdf(file_path)
    chunks = chunk_legal_text(raw_text, title)

    if not chunks:
        # Nettoyage : suppression de l'enregistrement et du fichier
        db.delete(document)
        db.commit()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail="Impossible d'extraire du texte de ce PDF. Vérifiez qu'il n'est pas scanné comme une image ou vide.",
        )

    # Stockage des chunks avec embeddings
    stored_count = 0
    for chunk_data in chunks:
        try:
            store_chunk_with_embedding(
                db=db,
                document_id=document.id,
                content=chunk_data["content"],
                article_reference=chunk_data["article_reference"],
            )
            stored_count += 1
        except HTTPException:
            # Re-lever les HTTPException (ex: quota épuisé 503) telles quelles
            db.delete(document)
            db.commit()
            if os.path.exists(file_path):
                os.remove(file_path)
            raise
        except Exception as e:
            print(f"Erreur lors du stockage du chunk: {e}")
            continue

    if stored_count == 0:
        # Nettoyage : suppression de l'enregistrement et du fichier
        db.delete(document)
        db.commit()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=500,
            detail="Erreur technique lors de la génération des embeddings vectoriels. Veuillez vérifier votre clé API Gemini.",
        )

    return {
        "message": f"Document '{title}' uploadé et traité avec succès",
        "document_id": document.id,
        "chunks_created": stored_count,
    }


@router.get("/documents", response_model=List[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Liste tous les documents juridiques avec leur nombre de chunks."""
    documents = db.query(Document).order_by(Document.uploaded_at.desc()).all()
    result = []
    for doc in documents:
        chunk_count = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == doc.id)
            .count()
        )
        result.append(
            DocumentResponse(
                id=doc.id,
                filename=doc.filename,
                title=doc.title,
                uploaded_at=doc.uploaded_at.isoformat(),
                chunk_count=chunk_count,
            )
        )
    return result


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Supprime un document et tous ses chunks associés."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")

    # Suppression du fichier physique
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    db.delete(document)
    db.commit()

    return {"message": f"Document '{document.title}' supprimé avec succès"}


# === Routes Gestion des Utilisateurs ===


@router.get("/users", response_model=List[UserAdminResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Liste tous les utilisateurs avec leurs statistiques."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for user in users:
        conversation_count = (
            db.query(Conversation).filter(Conversation.user_id == user.id).count()
        )
        message_count = (
            db.query(Message)
            .join(Conversation)
            .filter(Conversation.user_id == user.id, Message.role == "user")
            .count()
        )
        result.append(
            UserAdminResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_admin=user.is_admin,
                is_active=user.is_active,
                created_at=user.created_at.isoformat(),
                conversation_count=conversation_count,
                message_count=message_count,
            )
        )
    return result


@router.patch("/users/{user_id}/toggle-admin")
def toggle_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Promeut ou rétrograde un utilisateur (admin ↔ utilisateur)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="Vous ne pouvez pas modifier votre propre rôle d'administrateur.",
        )
    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)
    action = "promu administrateur" if user.is_admin else "rétrogradé utilisateur"
    return {
        "message": f"'{user.full_name}' a été {action} avec succès.",
        "is_admin": user.is_admin,
    }


@router.patch("/users/{user_id}/toggle-active")
def toggle_active(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Bloque ou débloque un utilisateur."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="Vous ne pouvez pas suspendre votre propre compte.",
        )
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    action = "débloqué" if user.is_active else "bloqué"
    return {
        "message": f"'{user.full_name}' a été {action} avec succès.",
        "is_active": user.is_active,
    }


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Supprime définitivement un compte utilisateur et toutes ses données."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="Vous ne pouvez pas supprimer votre propre compte depuis ce panneau.",
        )
    full_name = user.full_name
    db.delete(user)
    db.commit()
    return {"message": f"Le compte de '{full_name}' a été supprimé définitivement."}
