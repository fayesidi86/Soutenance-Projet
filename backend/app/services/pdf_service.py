"""Service d'extraction et de découpage des PDF juridiques maliens."""

import re
from typing import Dict, List

from pypdf import PdfReader


def extract_text_from_pdf(file_path: str) -> str:
    """Extrait le texte brut de toutes les pages d'un fichier PDF."""
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text


def chunk_legal_text(text: str, document_title: str) -> List[Dict[str, str]]:
    """
    Découpe un texte juridique en chunks intelligents.
    Tente d'abord un découpage par articles (Art. X / Article X),
    puis se rabat sur un découpage par paragraphes si pas d'articles détectés.
    """
    chunks: List[Dict[str, str]] = []

    # Tentative de découpage par articles
    article_pattern = (
        r"(Art(?:icle)?\.?\s*\d+[\s\S]*?)(?=Art(?:icle)?\.?\s*\d+|$)"
    )
    articles = re.findall(article_pattern, text, re.IGNORECASE)

    if articles and len(articles) > 1:
        for article in articles:
            article = article.strip()
            if len(article) < 20:
                continue

            # Extraction de la référence d'article
            ref_match = re.match(
                r"(Art(?:icle)?\.?\s*\d+(?:\s*[-–]\s*\d+)?)",
                article,
                re.IGNORECASE,
            )
            reference = ref_match.group(1).strip() if ref_match else ""

            # Si le chunk est trop long, on le sous-découpe
            if len(article) > 2000:
                sub_chunks = _split_long_text(article, 1500)
                for i, sub in enumerate(sub_chunks):
                    chunks.append(
                        {
                            "content": sub.strip(),
                            "article_reference": (
                                f"{reference} (partie {i + 1})"
                                if reference
                                else f"Section (partie {i + 1})"
                            ),
                            "document_title": document_title,
                        }
                    )
            else:
                chunks.append(
                    {
                        "content": article,
                        "article_reference": (
                            reference if reference else "Section non numérotée"
                        ),
                        "document_title": document_title,
                    }
                )
    else:
        # Découpage par paragraphes comme fallback
        paragraphs = text.split("\n\n")
        current_chunk = ""
        chunk_index = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current_chunk) + len(para) > 1500:
                if current_chunk:
                    chunk_index += 1
                    chunks.append(
                        {
                            "content": current_chunk.strip(),
                            "article_reference": f"Section {chunk_index}",
                            "document_title": document_title,
                        }
                    )
                current_chunk = para
            else:
                current_chunk += "\n\n" + para if current_chunk else para

        if current_chunk.strip():
            chunk_index += 1
            chunks.append(
                {
                    "content": current_chunk.strip(),
                    "article_reference": f"Section {chunk_index}",
                    "document_title": document_title,
                }
            )

    return chunks


def _split_long_text(text: str, max_length: int) -> List[str]:
    """Sous-découpe un texte trop long en morceaux par phrases."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    parts: List[str] = []
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) > max_length and current:
            parts.append(current)
            current = sentence
        else:
            current += " " + sentence if current else sentence

    if current:
        parts.append(current)

    return parts
