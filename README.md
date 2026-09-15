# 🇲🇱 AssistantJuridique MALI

**Assistant juridique intelligent** basé sur les textes de loi du Mali, propulsé par l'IA (Google Gemini) et une architecture **RAG** (Retrieval-Augmented Generation).

---

## 📋 Table des matières

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
  - [1. Base de données PostgreSQL](#1-base-de-données-postgresql)
  - [2. Backend FastAPI](#2-backend-fastapi)
  - [3. Frontend React/Vite](#3-frontend-reactvite)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Structure du projet](#structure-du-projet)

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Frontend      │────▶│   Backend FastAPI     │────▶│  PostgreSQL +       │
│   React + Vite  │◀────│   (API REST + RAG)    │◀────│  pgvector           │
│   Tailwind CSS  │     │                      │     │                     │
└─────────────────┘     └──────────┬───────────┘     └─────────────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │   Google Gemini API   │
                        │   - Embeddings        │
                        │   - LLM Chat          │
                        └──────────────────────┘
```

**Flux RAG :**
1. L'admin uploade un PDF de loi malienne
2. Le PDF est découpé en chunks (par articles)
3. Chaque chunk est vectorisé via `gemini-embedding-001` (768 dimensions)
4. L'utilisateur pose une question
5. Les 4 chunks les plus pertinents sont récupérés (distance cosinus)
6. Gemini génère une réponse basée **exclusivement** sur ces textes, avec citations

---

## ⚙️ Prérequis

- **Python** 3.10+ 
- **Node.js** 18+ et **npm** 9+
- **PostgreSQL** 15+ avec l'extension **pgvector**
- **Clé API Google Gemini** (obtenir sur [Google AI Studio](https://aistudio.google.com/apikey))

---

## 🚀 Installation

### 1. Base de données PostgreSQL

```bash
# Connexion à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE assistant_juridique;

# Se connecter à la base
\c assistant_juridique

# Activer l'extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

# Quitter
\q
```

> **Note :** Si pgvector n'est pas installé, suivez les instructions sur [pgvector GitHub](https://github.com/pgvector/pgvector).

### 2. Backend FastAPI

```bash
# Se placer dans le dossier backend
cd backend

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Windows :
venv\Scripts\activate
# macOS/Linux :
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Copier et configurer le fichier .env
copy .env.example .env
# (ou `cp .env.example .env` sous macOS/Linux)

# ⚠️ IMPORTANT : Éditez le fichier .env et renseignez votre GEMINI_API_KEY
# Modifiez aussi DATABASE_URL si nécessaire

# Lancer le serveur
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Le backend sera accessible sur **http://localhost:8000**.  
La documentation Swagger est disponible sur **http://localhost:8000/docs**.

### 3. Frontend React/Vite

```bash
# Dans un nouveau terminal, se placer dans le dossier frontend
cd frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Le frontend sera accessible sur **http://localhost:5173**.

---

## 🔧 Configuration

Éditez le fichier `backend/.env` avec vos paramètres :

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://postgres:postgres@localhost:5432/assistant_juridique` |
| `SECRET_KEY` | Clé secrète pour les tokens JWT | Changez-la ! |
| `GEMINI_API_KEY` | Clé API Google Gemini | **(obligatoire)** |
| `LLM_MODEL` | Modèle Gemini pour le chat | `gemini-3.6-flash` |
| `EMBEDDING_MODEL` | Modèle d'embeddings | `gemini-embedding-001` |

---

## 📖 Utilisation

### Créer un compte administrateur

Pour le premier usage, créez un utilisateur normal via la page d'inscription, puis promouvez-le en admin via PostgreSQL :

```sql
UPDATE users SET is_admin = true WHERE email = 'votre@email.com';
```

### Alimenter la base documentaire

1. Connectez-vous avec un compte **admin**
2. Allez sur la page **Administration** (`/admin`)
3. Uploadez des fichiers PDF de textes de loi maliens (Constitution, Code de la Famille, Code du Travail, etc.)
4. Le système extrait automatiquement le texte, le découpe par articles et génère les embeddings vectoriels

### Poser des questions

1. Connectez-vous et accédez à la page **Chat** (`/chat`)
2. Posez une question sur le droit malien
3. L'assistant recherche les textes pertinents et vous répond avec des **citations précises** (nom du texte + numéro d'article)

---

## 📁 Structure du projet

```
AssistantJuridique_MALI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py          # Routes d'authentification (JWT)
│   │   │   ├── chat.py          # Route de chat RAG
│   │   │   └── admin.py         # Routes admin (upload PDF)
│   │   ├── core/
│   │   │   ├── config.py        # Configuration (Pydantic Settings)
│   │   │   ├── database.py      # Connexion SQLAlchemy
│   │   │   └── security.py      # JWT + bcrypt
│   │   ├── models/
│   │   │   └── models.py        # Modèles SQLAlchemy (User, Document, Chunk)
│   │   ├── services/
│   │   │   ├── pdf_service.py   # Extraction et découpage PDF
│   │   │   └── rag_service.py   # Embeddings, recherche vectorielle, LLM
│   │   └── main.py              # Point d'entrée FastAPI
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Barre latérale de navigation
│   │   │   ├── ChatWindow.jsx       # Zone de chat interactive
│   │   │   ├── SourceCard.jsx       # Carte de source juridique
│   │   │   └── DisclaimerBanner.jsx # Bannière d'avertissement IA
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx    # Page de connexion
│   │   │   ├── RegisterPage.jsx # Page d'inscription
│   │   │   ├── ChatPage.jsx     # Page principale de chat
│   │   │   └── AdminPage.jsx    # Page d'administration
│   │   ├── services/
│   │   │   └── api.js           # Client API Axios
│   │   ├── App.jsx              # Routeur principal
│   │   ├── index.css            # Styles globaux + Tailwind
│   │   └── main.jsx             # Point d'entrée React
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── tests/
│   ├── test_backend.py      # Tests unitaires et d'intégration du backend
│   ├── test_diag.py         # Script de diagnostic de l'API et de la clé Gemini
│   ├── test_find_model.py   # Test de connectivité et sélection du modèle LLM
│   ├── test_live.py         # Tests d'intégration en direct de l'API FastAPI
│   └── test_models.py       # Liste et test des modèles Gemini disponibles
└── README.md
```

---

## ⚠️ Avertissement

> **AssistantJuridique_MALI** est un système basé sur l'intelligence artificielle.
> Les réponses fournies le sont à titre informatif et ne remplacent en aucun cas
> les conseils d'un professionnel du droit (avocat, notaire, juriste).

---

## 🛠️ Technologies

| Composant | Technologies |
|-----------|-------------|
| **Backend** | FastAPI, SQLAlchemy, PostgreSQL, pgvector, Google GenAI SDK |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, Lucide Icons |
| **IA** | Gemini 3.6 Flash (LLM), gemini-embedding-001 (Embeddings 768d) |
| **Auth** | JWT (python-jose), bcrypt (passlib) |

---

*Développé pour la soutenance de projet — République du Mali 🇲🇱*
