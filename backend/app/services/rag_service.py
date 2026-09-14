import re
import unicodedata
from typing import Dict, List, Optional

import google.generativeai as genai
from fastapi import HTTPException
from google.api_core.exceptions import ResourceExhausted
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import DocumentChunk

# Configuration de l'API Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)


QUOTA_ERROR_MSG = (
    "Le service d'IA est temporairement indisponible : votre quota journalier "
    "de l'API Gemini est épuisé (limite gratuite de 1 000 requêtes/jour atteinte). "
    "Veuillez réessayer demain ou mettre à niveau votre plan sur https://ai.dev/rate-limit."
)


def _normalize_fast_text(text: str) -> str:
    """Convertit en minuscules, remplace les tirets par des espaces, supprime accents et ponctuation."""
    t = text.strip().lower().replace("-", " ")
    nfd = unicodedata.normalize("NFD", t)
    without_accents = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    cleaned = re.sub(r"[^\w\s]", "", without_accents)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Supprimer les formules de politesse de fin de phrase (svp, stp, s'il vous plaît)
    polite_suffixes = [
        "sil te plait", "sil vous plait", "s il te plait", "s il vous plait",
        "stp", "svp", "stpl", "svpl"
    ]
    for suf in polite_suffixes:
        if cleaned.endswith(" " + suf):
            cleaned = cleaned[: -len(suf) - 1].strip()

    return cleaned


# Ensemble de jetons exclusivement dédiés aux salutations et civilités
COURTESY_TOKENS = {
    "bonjour", "salut", "bonsoir", "coucou", "hello", "hi", "hey", "yo",
    "good", "morning", "evening", "afternoon",
    "salam", "alaykoum", "alaikoum", "assalamu", "alaikum", "assalamou",
    "comment", "vas", "tu", "vastu", "allez", "vous", "allezvous", "ca", "va",
    "et", "moi", "bien", "merci", "la", "sante", "famille", "bot", "assistant",
    "lassistant", "tout", "le", "monde", "a", "tous", "cher", "est", "ce", "que",
    "i", "ni", "sogoma", "tile", "wula", "su", "aw", "baara", "ce", "bisimila", "anba", "ko", "kassama",
    "qui", "es", "etes", "nom", "role", "cree", "aide", "aidemoi", "aidezmoi", "besoin", "daide",
    "que", "peux", "peuxtu", "pouvez", "faire", "quelles", "sont", "tes", "vos", "capacites",
    "fonctions", "au", "revoir", "a", "bientot", "adieu", "bonne", "journee", "soiree", "nuit",
    "plus", "tard", "demain", "tchao", "byebye", "bye", "ok", "daccord", "entendu", "compris", "parfait", "oui"
}


def is_pure_greeting(cleaned_query: str) -> bool:
    """Vérifie si tous les mots de la requête appartiennent au vocabulaire des salutations/civilités."""
    tokens = cleaned_query.split()
    if not tokens:
        return False
    return all(tok in COURTESY_TOKENS for tok in tokens)


def is_fast_greeting(query: str) -> Optional[str]:
    """
    Détecte instantanément les salutations courantes, formules de politesse,
    expressions en bambara, demandes d'identité et de capacités sans appel LLM/RAG.
    Retourne la réponse rapide si détecté, sinon None.
    """
    cleaned = _normalize_fast_text(query)
    if not cleaned:
        return None

    # 1. Vérification par jetons purement courtois (ex: "bonjour comment vas tu et vous")
    if is_pure_greeting(cleaned):
        # Réponse adaptée selon l'intention principale
        if any(w in cleaned for w in ["qui", "nom", "role", "cree"]):
            return (
                "Je suis l'**Assistant Juridique MALI**, une intelligence artificielle conçue pour vous aider "
                "à consulter et comprendre la législation malienne (Constitution, Code du Travail, Code de la Famille, etc.). "
                "Posez-moi une question juridique et je vous répondrai en me basant sur les textes officiels !"
            )
        if any(w in cleaned for w in ["aide", "faire", "capacite", "fonction"]):
            return (
                "Je peux vous aider à :\n"
                "- Rechercher des articles de loi précis dans la législation malienne\n"
                "- Répondre à vos questions juridiques (droit du travail, droit civil, constitution, etc.)\n"
                "- Citer les sources juridiques officielles exactes\n\n"
                "Que souhaitez-vous savoir ?"
            )
        if any(w in cleaned for w in ["comment", "vas", "allez", "sante", "ca va"]):
            return (
                "Je vais très bien, merci ! En tant qu'assistant juridique du Mali, je suis en pleine forme pour vous "
                "aider à consulter et comprendre les textes de loi. Que souhaitez-vous savoir aujourd'hui ?"
            )
        if any(w in cleaned for w in ["merci", "bravo", "genial", "super"]):
            return "Je vous en prie ! C'est un plaisir de vous aider. N'hésitez pas si vous avez d'autres questions sur le droit malien."
        if any(w in cleaned for w in ["revoir", "bientot", "demain", "bye", "tchao"]):
            return "Au revoir et à bientôt ! N'hésitez pas à revenir dès que vous avez besoin d'assistance juridique."

        return (
            "Bonjour ! I ni ce ! Je suis votre assistant juridique intelligent spécialisé dans le droit malien. "
            "Comment puis-je vous aider aujourd'hui ? Vous pouvez me poser des questions sur les lois, "
            "codes et réglementations du Mali."
        )

    return None


def generate_embedding(content: str) -> List[float]:
    """Génère un vecteur d'embedding pour un texte donné via Gemini."""
    try:
        result = genai.embed_content(
            model=settings.EMBEDDING_MODEL,
            content=content,
            output_dimensionality=768,
        )
        return result["embedding"]
    except ResourceExhausted:
        raise HTTPException(
            status_code=503,
            detail=QUOTA_ERROR_MSG,
        )


def store_chunk_with_embedding(
    db: Session, document_id: int, content: str, article_reference: str
) -> DocumentChunk:
    """Stocke un chunk de document avec son embedding vectoriel en base de données."""
    embedding = generate_embedding(content)
    chunk = DocumentChunk(
        document_id=document_id,
        content=content,
        article_reference=article_reference,
        embedding=embedding,
    )
    db.add(chunk)
    db.commit()
    db.refresh(chunk)
    return chunk


def search_similar_chunks(db: Session, query: str, k: int = 4) -> List[Dict]:
    """
    Recherche les k chunks les plus similaires à la requête
    en utilisant la distance cosinus (<=>).
    """
    query_embedding = generate_embedding(query)
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    sql = text(
        """
        SELECT dc.id, dc.content, dc.article_reference, dc.document_id,
               d.title AS document_title, d.filename,
               dc.embedding <=> CAST(:embedding AS vector) AS distance
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        ORDER BY dc.embedding <=> CAST(:embedding AS vector)
        LIMIT :k
    """
    )

    results = db.execute(sql, {"embedding": embedding_str, "k": k}).fetchall()

    chunks = []
    for row in results:
        chunks.append(
            {
                "id": row.id,
                "content": row.content,
                "article_reference": row.article_reference,
                "document_id": row.document_id,
                "document_title": row.document_title,
                "filename": row.filename,
                "distance": float(row.distance),
            }
        )

    return chunks


def generate_legal_response(
    query: str,
    context_chunks: List[Dict],
    history: Optional[List[Dict]] = None,
) -> str:
    """
    Génère une réponse juridique ou générale en utilisant Gemini.
    Si context_chunks est présent, la réponse juridique s'appuie STRICTEMENT sur ces extraits avec citations.
    """
    if not context_chunks:
        prompt_no_context = f"""Tu es un assistant juridique spécialisé dans le droit malien, expert en vulgarisation juridique.
L'utilisateur te pose la question suivante : "{query}"

RÈGLE ABSOLUE ET IMPÉRATIVE :
AVANT MÊME D'ÉVOQUER OU DE DONNER LA MOINDRE LOI, TU DOIS OBLIGATOIREMENT DONNER UNE DÉFINITION CLAIRE ET SIMPLE DE LA NOTION DEMANDÉE.

TON ET STYLE :
- Rédige tes réponses dans un **français très simple, clair et facile à comprendre par tous**, sans jargon juridique complexe.
- Si un terme technique est inévitable, explique-le immédiatement avec des mots simples.

INSTRUCTIONS DE RÉPONSE :
- Si la question est une salutation ou une civilité générale, réponds amicalement et poliment.
- Si la question concerne un sujet ou une notion juridique :
  1. **💡 Définition claire et simple de la notion** : Commence TOUJOURS par donner une définition claire, concrète et simple de la notion demandée, AVANT TOUTE AUTRE CHOSE.
  2. Indique ensuite poliment que la base documentaire ne contient pas actuellement de texte de loi correspondant, et invite l'utilisateur (ou l'administrateur) à ajouter le document PDF sur la page Administration.
"""
        try:
            model = genai.GenerativeModel(settings.LLM_MODEL)
            response = model.generate_content(prompt_no_context)
            return response.text
        except ResourceExhausted:
            raise HTTPException(
                status_code=503,
                detail=QUOTA_ERROR_MSG,
            )
        except Exception:
            return (
                "Je n'ai trouvé aucun texte de loi pertinent dans ma base de données "
                "pour répondre à votre question. Veuillez vérifier que les documents "
                "ont été ajoutés dans l'espace Administration."
            )

    context_text = "\n\n".join(
        [
            f"--- Source : {chunk['document_title']} | {chunk['article_reference']} ---\n"
            f"{chunk['content']}"
            for chunk in context_chunks
        ]
    )

    # Construction du bloc historique (4 derniers échanges max)
    history_block = ""
    if history:
        recent = history[-8:]  # 4 questions + 4 réponses
        lines = []
        for msg in recent:
            role_label = "Utilisateur" if msg["role"] == "user" else "Assistant"
            content = msg["content"]
            if len(content) > 600:
                content = content[:600] + "..."
            lines.append(f"{role_label} : {content}")
        history_block = "\n".join(lines)

    history_section = ""
    if history_block:
        history_section = f"""
HISTORIQUE RÉCENT DE LA CONVERSATION (pour comprendre le contexte) :
{history_block}

"""

    prompt = f"""Tu es un assistant juridique spécialisé dans le droit malien, expert en vulgarisation juridique.

RÈGLE ABSOLUE ET IMPÉRATIVE (ORDRE OBLIGATOIRE) :
AVANT DE CITER OU DE DONNER LA MOINDRE LOI, LE MOINDRE ARTICLE OU LA MOINDRE RÈGLE JURIDIQUE, TU DOIS OBLIGATOIREMENT COMMENCER PAR DONNER UNE DÉFINITION CLAIRE, SIMPLE ET ACCESSIBLE DE LA NOTION (OU DES NOTIONS) CONCERNÉE(S).

TON ET STYLE DE RÉDACTION :
- Rédige toutes tes réponses dans un **français très simple, clair et facile à comprendre par le grand public**.
- **Évite au maximum le jargon juridique complexe**. Si l'utilisation d'un terme technique est indispensable, donne immédiatement sa définition entre parenthèses avec des mots simples de tous les jours.

STRUCTURE OBLIGATOIRE DE TA RÉPONSE (À RESPECTER STRICTEMENT DANS CET ORDRE) :
1. **💡 Définition claire et simple de la notion** :
   - Donne d'abord une définition claire, concrète et simple de la notion demandée (ex: qu'est-ce que le licenciement, le contrat de travail, l'autorité parentale, etc.), AVANT TOUTE MENTION DE LOI OU D'ARTICLE.

2. **📜 Ce que dit la loi (Réponse détaillée et articles)** :
   - Ce n'est qu'APRÈS avoir clairement défini la notion que tu réponds précisément à la question en t'appuyant STRICTEMENT sur les textes officiels ci-dessous, en expliquant les règles avec simplicité et en citant les articles.

RÈGLES STRICTES :
1. Si l'utilisateur vous salue ou pose une question de politesse/générale, réponds d'abord poliment avant de traiter sa demande.
2. Pour la partie juridique, réfère-toi STRICTEMENT aux extraits de loi fournis ci-dessous.
3. Cite TOUJOURS tes sources avec précision (nom du document et numéro d'article).
4. Ne fais JAMAIS référence à des lois ou des articles absents du contexte fourni.
5. Structure ta réponse de manière claire et lisible en Markdown (titres, puces, gras).
6. N'invente aucune information juridique.

TEXTES DE LOI DISPONIBLES :
{context_text}
{history_section}
QUESTION ACTUELLE DE L'UTILISATEUR :
{query}

RÉPONSE (Commence TOUJOURS par la Définition claire de la notion AVANT de donner une quelconque loi) :"""

    try:
        model = genai.GenerativeModel(settings.LLM_MODEL)
        response = model.generate_content(prompt)
        return response.text
    except ResourceExhausted:
        raise HTTPException(
            status_code=503,
            detail=QUOTA_ERROR_MSG,
        )


def generate_legal_response_stream(
    query: str,
    context_chunks: List[Dict],
    history: Optional[List[Dict]] = None,
):
    """
    Génère une réponse juridique en mode streaming (jeton par jeton).
    """
    if not context_chunks:
        prompt_no_context = f"""Tu es un assistant juridique spécialisé dans le droit malien, expert en vulgarisation juridique.
L'utilisateur te pose la question suivante : "{query}"

RÈGLE ABSOLUE ET IMPÉRATIVE :
AVANT MÊME D'ÉVOQUER OU DE DONNER LA MOINDRE LOI, TU DOIS OBLIGATOIREMENT DONNER UNE DÉFINITION CLAIRE ET SIMPLE DE LA NOTION DEMANDÉE.

TON ET STYLE :
- Rédige tes réponses dans un **français très simple, clair et facile à comprendre par tous**, sans jargon juridique complexe.
- Si un terme technique est inévitable, explique-le immédiatement avec des mots simples.

INSTRUCTIONS DE RÉPONSE :
- Si la question est une salutation ou une civilité générale, réponds amicalement et poliment.
- Si la question concerne un sujet ou une notion juridique :
  1. **💡 Définition claire et simple de la notion** : Commence TOUJOURS par donner une définition claire, concrète et simple de la notion demandée, AVANT TOUTE AUTRE CHOSE.
  2. Indique ensuite poliment que la base documentaire ne contient pas actuellement de texte de loi correspondant, et invite l'utilisateur (ou l'administrateur) à ajouter le document PDF sur la page Administration.
"""
        try:
            model = genai.GenerativeModel(settings.LLM_MODEL)
            response = model.generate_content_stream(prompt_no_context)
            for chunk in response:
                try:
                    if chunk.text:
                        yield chunk.text
                except Exception:
                    pass
            return
        except ResourceExhausted:
            raise HTTPException(
                status_code=503,
                detail=QUOTA_ERROR_MSG,
            )
        except Exception:
            yield (
                "Je n'ai trouvé aucun texte de loi pertinent dans ma base de données "
                "pour répondre à votre question. Veuillez vérifier que les documents "
                "ont été ajoutés dans l'espace Administration."
            )
            return

    context_text = "\n\n".join(
        [
            f"--- Source : {chunk['document_title']} | {chunk['article_reference']} ---\n"
            f"{chunk['content']}"
            for chunk in context_chunks
        ]
    )

    history_block = ""
    if history:
        recent = history[-8:]
        lines = []
        for msg in recent:
            role_label = "Utilisateur" if msg["role"] == "user" else "Assistant"
            content = msg["content"]
            if len(content) > 600:
                content = content[:600] + "..."
            lines.append(f"{role_label} : {content}")
        history_block = "\n".join(lines)

    history_section = ""
    if history_block:
        history_section = f"""
HISTORIQUE RÉCENT DE LA CONVERSATION (pour comprendre le contexte) :
{history_block}

"""

    prompt = f"""Tu es un assistant juridique spécialisé dans le droit malien, expert en vulgarisation juridique.

RÈGLE ABSOLUE ET IMPÉRATIVE (ORDRE OBLIGATOIRE) :
AVANT DE CITER OU DE DONNER LA MOINDRE LOI, LE MOINDRE ARTICLE OU LA MOINDRE RÈGLE JURIDIQUE, TU DOIS OBLIGATOIREMENT COMMENCER PAR DONNER UNE DÉFINITION CLAIRE, SIMPLE ET ACCESSIBLE DE LA NOTION (OU DES NOTIONS) CONCERNÉE(S).

TON ET STYLE DE RÉDACTION :
- Rédige toutes tes réponses dans un **français très simple, clair et facile à comprendre par le grand public**.
- **Évite au maximum le jargon juridique complexe**. Si l'utilisation d'un terme technique est indispensable, donne immédiatement sa définition entre parenthèses avec des mots simples de tous les jours.

STRUCTURE OBLIGATOIRE DE TA RÉPONSE (À RESPECTER STRICTEMENT DANS CET ORDRE) :
1. **💡 Définition claire et simple de la notion** :
   - Donne d'abord une définition claire, concrète et simple de la notion demandée (ex: qu'est-ce que le licenciement, le contrat de travail, l'autorité parentale, etc.), AVANT TOUTE MENTION DE LOI OU D'ARTICLE.

2. **📜 Ce que dit la loi (Réponse détaillée et articles)** :
   - Ce n'est qu'APRÈS avoir clairement défini la notion que tu réponds précisément à la question en t'appuyant STRICTEMENT sur les textes officiels ci-dessous, en expliquant les règles avec simplicité et en citant les articles.

RÈGLES STRICTES :
1. Si l'utilisateur vous salue ou pose une question de politesse/générale, réponds d'abord poliment avant de traiter sa demande.
2. Pour la partie juridique, réfère-toi STRICTEMENT aux extraits de loi fournis ci-dessous.
3. Cite TOUJOURS tes sources avec précision (nom du document et numéro d'article).
4. Ne fais JAMAIS référence à des lois ou des articles absents du contexte fourni.
5. Structure ta réponse de manière claire et lisible en Markdown (titres, puces, gras).
6. N'invente aucune information juridique.

TEXTES DE LOI DISPONIBLES :
{context_text}
{history_section}
QUESTION ACTUELLE DE L'UTILISATEUR :
{query}

RÉPONSE (Commence TOUJOURS par la Définition claire de la notion AVANT de donner une quelconque loi) :"""

    try:
        model = genai.GenerativeModel(settings.LLM_MODEL)
        response = model.generate_content_stream(prompt)
        for chunk in response:
            try:
                if chunk.text:
                    yield chunk.text
            except Exception:
                pass
    except ResourceExhausted:
        raise HTTPException(
            status_code=503,
            detail=QUOTA_ERROR_MSG,
        )


