import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.api.auth import get_current_user
from app.models.models import Conversation, Message, User
from app.services.rag_service import (
    generate_legal_response,
    generate_legal_response_stream,
    search_similar_chunks,
    is_fast_greeting,
    is_pure_greeting,
    _normalize_fast_text,
)

router = APIRouter(prefix="/api/chat", tags=["Chat"])


# === Schémas Pydantic ===


class ChatRequest(BaseModel):
    question: str
    conversation_id: Optional[int] = None


class SourceInfo(BaseModel):
    document_title: str
    article_reference: str
    content: str
    distance: float


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceInfo]
    conversation_id: int


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    sources: Optional[List[SourceInfo]] = None
    created_at: str

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: str

    class Config:
        from_attributes = True


class ConversationDetailResponse(BaseModel):
    id: int
    title: str
    created_at: str
    messages: List[MessageResponse]

    class Config:
        from_attributes = True


# === Routes ===


@router.post("/ask", response_model=ChatResponse)
def ask_question(
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pose une question à l'assistant.
    Répond immédiatement aux salutations/questions générales.
    Effectue une recherche RAG basée sur les textes de loi pour les questions juridiques.
    Sauvegarde la question et la réponse dans la session de discussion.
    """
    if not data.question.strip():
        raise HTTPException(
            status_code=400, detail="La question ne peut pas être vide"
        )

    # 1. Récupération ou création de la conversation
    if data.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == data.conversation_id,
                Conversation.user_id == current_user.id,
            )
            .first()
        )
        if not conversation:
            raise HTTPException(
                status_code=404, detail="Session de discussion non trouvée"
            )
    else:
        # Création d'une nouvelle conversation
        title = data.question.strip()
        if len(title) > 40:
            title = title[:37] + "..."
        conversation = Conversation(user_id=current_user.id, title=title)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Vérification rapide des salutations / civilités (Chemin ultra-rapide)
    fast_reply = is_fast_greeting(data.question)
    if fast_reply:
        user_msg = Message(
            conversation_id=conversation.id, role="user", content=data.question
        )
        db.add(user_msg)
        assistant_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=fast_reply,
            sources=[],
        )
        db.add(assistant_msg)
        db.commit()

        return ChatResponse(
            answer=fast_reply, sources=[], conversation_id=conversation.id
        )

    # 3. Sauvegarde du message utilisateur pour les autres questions
    user_msg = Message(
        conversation_id=conversation.id, role="user", content=data.question
    )
    db.add(user_msg)

    # 4. Récupération de l'historique récent (messages AVANT la question actuelle)
    previous_messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    # Construire l'historique sous forme de dicts simples
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in previous_messages
    ]

    # 5. Recherche des chunks similaires via pgvector
    chunks = search_similar_chunks(db, data.question, k=4)

    # 6. Génération de la réponse via Gemini LLM (avec historique de conversation)
    answer = generate_legal_response(
        query=data.question,
        context_chunks=chunks,
        history=history if history else None,
    )

    # 7. Construction des sources : N'inclure les cartes de sources QUE s'il s'agit d'une vraie réponse juridique avec citations
    has_legal_citation = any(
        kw in answer.lower() for kw in ["article", "code", "loi", "constitution", "décret", "ordonnance", "chapitre", "titre"]
    )
    is_greeting_query = is_pure_greeting(_normalize_fast_text(data.question))

    if not has_legal_citation or is_greeting_query:
        sources_data = []
    else:
        sources_data = [
            {
                "document_title": chunk["document_title"],
                "article_reference": chunk["article_reference"],
                "content": (
                    chunk["content"][:500] + "..."
                    if len(chunk["content"]) > 500
                    else chunk["content"]
                ),
                "distance": float(chunk["distance"]),
            }
            for chunk in chunks
            if chunk.get("distance", 1.0) <= 0.60  # Seuls les morceaux pertinents
        ]

    # 7. Sauvegarder la réponse de l'assistant
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=answer,
        sources=sources_data,
    )
    db.add(assistant_msg)
    db.commit()

    sources = [SourceInfo(**s) for s in sources_data]

    return ChatResponse(
        answer=answer, sources=sources, conversation_id=conversation.id
    )


@router.post("/ask/stream")
def ask_question_stream(
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pose une question à l'assistant avec génération en temps réel (Streaming SSE).
    """
    if not data.question.strip():
        raise HTTPException(
            status_code=400, detail="La question ne peut pas être vide"
        )

    # 1. Récupération ou création de la conversation
    if data.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == data.conversation_id,
                Conversation.user_id == current_user.id,
            )
            .first()
        )
        if not conversation:
            raise HTTPException(
                status_code=404, detail="Session de discussion non trouvée"
            )
    else:
        title = data.question.strip()
        if len(title) > 40:
            title = title[:37] + "..."
        conversation = Conversation(user_id=current_user.id, title=title)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Salutations rapides
    fast_reply = is_fast_greeting(data.question)
    if fast_reply:
        user_msg = Message(
            conversation_id=conversation.id, role="user", content=data.question
        )
        db.add(user_msg)
        assistant_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=fast_reply,
            sources=[],
        )
        db.add(assistant_msg)
        db.commit()

        def fast_stream():
            meta = json.dumps({"type": "metadata", "conversation_id": conversation.id, "sources": []})
            yield f"data: {meta}\n\n"
            tok = json.dumps({"type": "token", "text": fast_reply})
            yield f"data: {tok}\n\n"
            done = json.dumps({"type": "done"})
            yield f"data: {done}\n\n"

        return StreamingResponse(
            fast_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    # 3. Message utilisateur
    user_msg = Message(
        conversation_id=conversation.id, role="user", content=data.question
    )
    db.add(user_msg)
    db.commit()

    # 4. Historique
    previous_messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in previous_messages
        if msg.id != user_msg.id  # Exclure uniquement le message courant (par ID)
    ]

    # 5. Recherche vectorielle
    chunks = search_similar_chunks(db, data.question, k=4)

    is_greeting_query = is_pure_greeting(_normalize_fast_text(data.question))

    sources_data = [
        {
            "document_title": chunk["document_title"],
            "article_reference": chunk["article_reference"],
            "content": (
                chunk["content"][:500] + "..."
                if len(chunk["content"]) > 500
                else chunk["content"]
            ),
            "distance": float(chunk["distance"]),
        }
        for chunk in chunks
        if chunk.get("distance", 1.0) <= 0.60
    ] if not is_greeting_query else []

    def event_stream():
        # Envoi initial des métadonnées
        meta = json.dumps({"type": "metadata", "conversation_id": conversation.id, "sources": sources_data})
        yield f"data: {meta}\n\n"

        full_answer = ""
        for chunk_text in generate_legal_response_stream(
            query=data.question,
            context_chunks=chunks,
            history=history if history else None,
        ):
            full_answer += chunk_text
            payload = json.dumps({"type": "token", "text": chunk_text})
            yield f"data: {payload}\n\n"

        # Sauvegarder la réponse complète via une session indépendante
        try:
            has_legal_citation = any(
                kw in full_answer.lower() for kw in ["article", "code", "loi", "constitution", "décret", "ordonnance", "chapitre", "titre"]
            )
            final_sources = sources_data if has_legal_citation and not is_greeting_query else []

            save_db = SessionLocal()
            try:
                assistant_msg = Message(
                    conversation_id=conversation.id,
                    role="assistant",
                    content=full_answer,
                    sources=final_sources,
                )
                save_db.add(assistant_msg)
                save_db.commit()
            finally:
                save_db.close()
        except Exception as e:
            print(f"Error saving assistant message: {e}")

        done = json.dumps({"type": "done"})
        yield f"data: {done}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )



@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Récupère toutes les conversations de l'utilisateur connecté."""
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )
    return [
        ConversationResponse(
            id=c.id, title=c.title, created_at=c.created_at.isoformat()
        )
        for c in conversations
    ]


@router.get(
    "/conversations/{conversation_id}", response_model=ConversationDetailResponse
)
def get_conversation_detail(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Récupère les détails d'une conversation spécifique avec tous ses messages."""
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(
            status_code=404, detail="Session de discussion non trouvée"
        )

    messages_res = []
    for msg in conversation.messages:
        sources_list = None
        if msg.sources:
            sources_list = [
                SourceInfo(
                    document_title=s["document_title"],
                    article_reference=s["article_reference"],
                    content=s["content"],
                    distance=s["distance"],
                )
                for s in msg.sources
            ]

        messages_res.append(
            MessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                sources=sources_list,
                created_at=msg.created_at.isoformat(),
            )
        )

    return ConversationDetailResponse(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at.isoformat(),
        messages=messages_res,
    )


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supprime une conversation de l'utilisateur."""
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(
            status_code=404, detail="Session de discussion non trouvée"
        )

    db.delete(conversation)
    db.commit()
    return {"message": "Discussion supprimée avec succès"}
