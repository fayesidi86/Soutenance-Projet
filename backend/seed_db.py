"""Script pour indexer automatiquement tous les PDF du dossier backend/uploads/ dans la base de données."""

import os
import sys
from sqlalchemy.orm import Session

# Ajouter le dossier parent au chemin de recherche pour pouvoir importer app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models.models import Document
from app.services.pdf_service import extract_text_from_pdf, chunk_legal_text
from app.services.rag_service import store_chunk_with_embedding


def seed_pdf_documents():
    """Parcourt le dossier uploads, extrait et indexe tous les fichiers PDF."""
    db: Session = SessionLocal()
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

    if not os.path.exists(upload_dir):
        print(f"Le dossier '{upload_dir}' n'existe pas. Création en cours...")
        os.makedirs(upload_dir)

    # Récupérer la liste des PDF
    pdf_files = [f for f in os.listdir(upload_dir) if f.lower().endswith(".pdf")]

    if not pdf_files:
        print("\nAucun fichier PDF trouvé dans le dossier 'backend/uploads/'.")
        print("Veuillez y copier vos fichiers PDF (ex: constitution.pdf) et relancer ce script.\n")
        db.close()
        return

    print(f"\n{len(pdf_files)} document(s) trouvé(s) dans 'backend/uploads/'. Début de l'indexation...\n")

    for filename in pdf_files:
        file_path = os.path.join(upload_dir, filename)
        title = os.path.splitext(filename)[0].replace("_", " ").capitalize()

        # Vérifier si le document est déjà indexé
        existing_doc = db.query(Document).filter(Document.filename == filename).first()
        if existing_doc:
            print(f"[-] '{filename}' est déjà indexé (ID: {existing_doc.id}). Passage au suivant.")
            continue

        print(f"[+] Traitement de '{filename}'...")
        try:
            # 1. Extraction du texte
            raw_text = extract_text_from_pdf(file_path)
            if not raw_text.strip():
                print(f"  [!] Erreur: Aucun texte extrait de '{filename}'. Il est peut-être scanné ou vide.")
                continue

            # 2. Découpage en chunks
            chunks = chunk_legal_text(raw_text, title)
            if not chunks:
                print(f"  [!] Erreur: Impossible de découper le texte de '{filename}' en articles.")
                continue

            # 3. Création de l'enregistrement de document en BDD
            document = Document(
                filename=filename,
                title=title,
                file_path=file_path
            )
            db.add(document)
            db.commit()
            db.refresh(document)

            print(f"  -> Enregistré en BDD (ID: {document.id}). Génération des embeddings pour {len(chunks)} chunks...")

            # 4. Stockage des chunks avec embeddings par batch (beaucoup plus rapide !)
            batch_size = 30
            stored_count = 0
            
            import google.generativeai as genai
            import time
            from app.core.config import settings
            from app.models.models import DocumentChunk
            
            genai.configure(api_key=settings.GEMINI_API_KEY)
            
            print(f"  -> Génération des embeddings par batch de {batch_size}...")
            for start_idx in range(0, len(chunks), batch_size):
                batch_chunks = chunks[start_idx:start_idx + batch_size]
                contents = [c["content"] for c in batch_chunks]
                
                try:
                    result = genai.embed_content(
                        model=settings.EMBEDDING_MODEL,
                        content=contents,
                        output_dimensionality=768
                    )
                    embeddings = result["embedding"]
                    
                    for chunk_data, emb in zip(batch_chunks, embeddings):
                        chunk = DocumentChunk(
                            document_id=document.id,
                            content=chunk_data["content"],
                            article_reference=chunk_data["article_reference"],
                            embedding=emb
                        )
                        db.add(chunk)
                    
                    db.commit()
                    stored_count += len(batch_chunks)
                    print(f"     Progression: {stored_count}/{len(chunks)} fragments indexés...")
                    
                    # Petit délai pour respecter les quotas de l'API gratuite Gemini
                    time.sleep(2.0)
                except Exception as e:
                    db.rollback()
                    print(f"  [!] Erreur sur le batch {start_idx//batch_size + 1}: {e}. Tentative un par un avec pause...")
                    # Fallback un par un en cas d'erreur de batch avec pause pour éviter de saturer le quota
                    for c_data in batch_chunks:
                        try:
                            store_chunk_with_embedding(
                                db=db,
                                document_id=document.id,
                                content=c_data["content"],
                                article_reference=c_data["article_reference"]
                            )
                            stored_count += 1
                            time.sleep(1.0)
                        except Exception as inner_e:
                            print(f"     [!] Erreur individuelle : {inner_e}")
                            time.sleep(3.0)
                            continue

            print(f"  [OK] Succès: {stored_count}/{len(chunks)} fragments indexés pour '{filename}'.\n")

        except Exception as e:
            db.rollback()
            print(f"  [!] Erreur générale lors du traitement de '{filename}': {e}\n")

    db.close()
    print("Processus d'indexation terminé.")


if __name__ == "__main__":
    # S'assurer que les tables existent
    Base.metadata.create_all(bind=engine)
    seed_pdf_documents()
