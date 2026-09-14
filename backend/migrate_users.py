"""
Script de migration : ajout des colonnes is_active et created_at a la table users.
Executez ce script UNE SEULE FOIS pour mettre a jour la base de donnees existante.

Usage:
    cd backend
    python migrate_users.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import engine


def migrate():
    with engine.connect() as conn:
        # Verifier si la colonne is_active existe deja
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'is_active'
        """))
        has_is_active = result.fetchone() is not None

        if not has_is_active:
            print("Ajout de la colonne 'is_active'...")
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE"
            ))
            print("OK - Colonne 'is_active' ajoutee.")
        else:
            print("INFO - Colonne 'is_active' deja presente.")

        # Verifier si la colonne created_at existe deja
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'created_at'
        """))
        has_created_at = result.fetchone() is not None

        if not has_created_at:
            print("Ajout de la colonne 'created_at'...")
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()"
            ))
            print("OK - Colonne 'created_at' ajoutee.")
        else:
            print("INFO - Colonne 'created_at' deja presente.")

        conn.commit()
        print("\nMigration terminee avec succes !")


if __name__ == "__main__":
    migrate()
