# 🇲🇱 AssistantJuridique MALI

**Assistant juridique intelligent** basé sur les textes de loi du Mali, propulsé par l'IA (Google Gemini) et une architecture **RAG** (Retrieval-Augmented Generation) haute performance avec streaming en temps réel, authentification Google OAuth, notifications de sécurité par email et résilience multi-modèles.

---

## 📋 Table des matières

- [Architecture & Fonctionnalités](#-architecture--fonctionnalités)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
  - [1. Base de données PostgreSQL](#1-base-de-données-postgresql)
  - [2. Backend FastAPI](#2-backend-fastapi)
  - [3. Frontend React/Vite](#3-frontend-reactvite)
- [Configuration (.env)](#-configuration)
- [Notifications Email (Gmail SMTP)](#-comment-configurer-les-notifications-email-avec-gmail-gratuit-)
- [Google Sign-In OAuth](#-comment-obtenir-un-google-client-id-gratuit-)
- [Déploiement en Production (Render & Vercel)](#-déploiement-en-production)
- [Utilisation](#-utilisation)
- [Structure du projet](#-structure-du-projet)
- [Technologies](#-technologies)

---

## 🏗️ Architecture & Fonctionnalités

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Frontend      │────▶│   Backend FastAPI     │────▶│  PostgreSQL +       │
│   React + Vite  │◀────│   (API REST + SSE)   │◀────│  pgvector           │
│   Tailwind CSS  │     │                      │     │                     │
└─────────────────┘     └──────────┬───────────┘     └─────────────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
          ┌──────────────────────┐    ┌─────────────────────┐
          │   Google Gemini API   │    │  Gmail SMTP Alerts  │
          │   - Embeddings 768d   │    │  (Connexions /      │
          │   - Fallback Cascade │    │   Inscriptions)     │
          └──────────────────────┘    └─────────────────────┘
```

### ✨ Points Forts du Système
1. **Streaming SSE Ultra-Fluide :** Réponses générées mot par mot en streaming Server-Sent Events avec en-têtes anti-buffering (`X-Accel-Buffering: no`).
2. **Authentification Hybride & Google OAuth :** Connexion classique par email/mot de passe ou connexion certifiée en un clic avec **Google Sign-In** (`@react-oauth/google` et `google-auth`).
3. **Alertes de Sécurité par Email :** Notification automatique par email (nom, adresse email, date/heure, IP et méthode) envoyée à l'administrateur à chaque nouvelle connexion d'un utilisateur.
4. **Design Adaptatif & Mode Clair/Sombre :** Thème dynamique avec bouton en haut à droite, contraste ultra-lisible et soigné aux couleurs nationales du Mali (Vert, Or, Rouge).
5. **Expérience Mobile Optimisée :** Interface responsive avec tiroir latéral coulissant (3 barres fixes ☰) pour consulter facilement l'historique et zone de saisie ancrée en bas d'écran (`100dvh`).
6. **Résilience & Cascade Multi-Modèles :** En cas de pic de trafic ou indisponibilité temporaire (erreur `503 UNAVAILABLE` de Google), le backend bascule automatiquement sur les modèles de secours (`gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.7-flash`).
7. **Indexation PDF par Batch :** Vectorisation et insertion groupées des chunks pour traiter de volumineux codes de loi sans dépassement de quota.
8. **Détection Rapide des Salutations :** Réponse instantanée aux formules de politesse et salutations (en français et en bambara : *I ni ce*, *I ni sogoma*, etc.) sans consommer d'appel LLM.
9. **Vulgarisation Juridique Systématique :** Chaque réponse commence obligatoirement par une définition claire et vulgarisée de la notion demandée avant de citer les articles officiels.
10. **Sources & Citations Exactes :** Citation systématique du document source et des numéros d'articles avec distance vectorielle cosinus.

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

# Lancer le serveur
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Le backend sera accessible sur **http://localhost:8000**.  
La documentation Swagger interactive est disponible sur **http://localhost:8000/docs**.

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

Éditez les fichiers `backend/.env` et `frontend/.env` avec vos paramètres :

### Backend (`backend/.env`)

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://postgres:postgres@localhost:5432/assistant_juridique` |
| `SECRET_KEY` | Clé secrète pour les tokens JWT | *(Clé aléatoire sécurisée)* |
| `GEMINI_API_KEY` | Clé API Google Gemini | **(obligatoire)** |
| `LLM_MODEL` | Modèle Gemini pour le chat | `gemini-3.6-flash` |
| `EMBEDDING_MODEL` | Modèle d'embeddings | `gemini-embedding-001` |
| `GOOGLE_CLIENT_ID` | Client ID Google OAuth (vérification des comptes Google) | *(Optionnel pour Google Sign-In)* |
| `EMAIL_NOTIFICATIONS_ENABLED` | Activer/Désactiver les alertes de connexion par email | `True` |
| `ADMIN_NOTIFICATION_EMAIL` | Adresse email recevant les alertes de connexion | `fayesidi86@gmail.com` |
| `SMTP_HOST` | Serveur SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP (TLS) | `587` |
| `SMTP_USER` | Email de l'expéditeur | `votre-email@gmail.com` |
| `SMTP_PASSWORD` | Mot de passe d'application SMTP | *(Mot de passe d'application Google)* |
| `SMTP_FROM_EMAIL` | Adresse d'expédition affichée | `votre-email@gmail.com` |

### Frontend (`frontend/.env` ou Vercel)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_API_URL` | URL de l'API backend en production | `https://votre-backend.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | Client ID Google OAuth pour le bouton Google | `xxxxxxxxxx.apps.googleusercontent.com` |

---

## 📧 Comment configurer les Notifications Email avec Gmail (Gratuit) :
1. Activez la **Validation en deux étapes** sur votre compte Google : [Sécurité du compte Google](https://myaccount.google.com/security).
2. Rendez-vous sur la page des **Mots de passe d'application** : [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Créez un mot de passe d'application (nommé par exemple `Assistant Juridique`).
4. Google génère un mot de passe sécurisé de 16 caractères (ex: `abcd efgh ijkl mnop`).
5. Renseignez dans votre fichier `backend/.env` (et dans les *Environment Variables* sur Render) :
   ```ini
   EMAIL_NOTIFICATIONS_ENABLED=True
   ADMIN_NOTIFICATION_EMAIL=fayesidi86@gmail.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=votre-email@gmail.com
   SMTP_PASSWORD=le-mot-de-passe-16-lettres-genere
   SMTP_FROM_EMAIL=votre-email@gmail.com
   SMTP_USE_TLS=True
   ```

---

## 🔑 Comment obtenir un Google Client ID (Gratuit) :
1. Rendez-vous sur la [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Créez un projet ou sélectionnez un projet existant.
3. Allez dans **API et services** > **Écran de consentement OAuth** et configurez-le (type *Externe*, nom de l'application).
4. Allez dans **Identifiants** > **Créer des identifiants** > **ID client OAuth**.
5. Choisissez **Application Web** et ajoutez :
   - Origines JavaScript autorisées : `http://localhost:5173` et l'URL de votre frontend Vercel (ex: `https://votre-site.vercel.app`).
6. Copiez le **Client ID** obtenu dans votre fichier `.env` (`GOOGLE_CLIENT_ID` et `VITE_GOOGLE_CLIENT_ID`).

---

## 🌐 Déploiement en Production

### 1. Backend sur Render (https://render.com)
1. Créez une base de données **PostgreSQL** sur Render (ou Neon/Supabase).
2. Créez un **Web Service** connecté à votre dépôt GitHub :
   - **Root Directory** : `backend`
   - **Runtime** : `Python 3`
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Ajoutez les variables d'environnement (`DATABASE_URL`, `GEMINI_API_KEY`, `SECRET_KEY`, `EMBEDDING_MODEL`, `LLM_MODEL`, `GOOGLE_CLIENT_ID`, `SMTP_USER`, `SMTP_PASSWORD`).
4. Notez l'URL publique générée (ex: `https://votre-backend.onrender.com`).

### 2. Frontend sur Vercel (https://vercel.com)
1. Importez votre dépôt GitHub sur Vercel.
2. Dans la configuration du projet :
   - **Framework Preset** : `Vite`
   - **Root Directory** : `frontend`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
3. Dans **Environment Variables**, ajoutez :
   - `VITE_API_URL` = `https://votre-backend.onrender.com` *(l'URL Render sans slash à la fin)*
   - `VITE_GOOGLE_CLIENT_ID` = `votre-client-id.apps.googleusercontent.com`
4. Cliquez sur **Deploy**.

---

## 📖 Utilisation

### Créer un compte administrateur
Pour promouvoir un compte en administrateur via PostgreSQL :

```sql
UPDATE users SET is_admin = true WHERE email = 'votre@email.com';
```

### Alimenter la base documentaire
1. Connectez-vous avec un compte **admin**
2. Allez sur la page **Administration** (`/admin`)
3. Uploadez des fichiers PDF de textes de loi maliens (Constitution, Code de la Famille, Code du Travail, etc.)
4. Le système extrait automatiquement le texte, le découpe par articles et génère les embeddings vectoriels.

### Poser des questions
1. Connectez-vous et accédez à la page **Chat** (`/chat`)
2. Posez une question sur le droit malien
3. L'assistant recherche les textes pertinents et vous répond avec des **citations précises** (nom du texte + numéro d'article).

---

## 📁 Structure du projet

```
AssistantJuridique_MALI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py          # Routes d'authentification (JWT & Google OAuth)
│   │   │   ├── chat.py          # Route de chat RAG & streaming SSE
│   │   │   └── admin.py         # Routes admin (upload & gestion des documents)
│   │   ├── core/
│   │   │   ├── config.py        # Configuration (Pydantic Settings & SMTP)
│   │   │   ├── database.py      # Connexion SQLAlchemy & session DB
│   │   │   └── security.py      # JWT & hachage bcrypt
│   │   ├── models/
│   │   │   └── models.py        # Modèles SQLAlchemy (User, Document, Chunk)
│   │   ├── services/
│   │   │   ├── email_service.py # Service d'alerte et notification de connexion SMTP
│   │   │   ├── pdf_service.py   # Extraction et découpage des PDF
│   │   │   └── rag_service.py   # Embeddings, recherche vectorielle cosinus, LLM cascade
│   │   └── main.py              # Point d'entrée FastAPI & middleware CORS
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Barre latérale & historique des conversations
│   │   │   ├── ChatWindow.jsx       # Zone de chat interactive & streaming
│   │   │   ├── SourceCard.jsx       # Carte de citation juridique
│   │   │   ├── ThemeToggle.jsx      # Bouton de bascule mode clair / sombre
│   │   │   └── DisclaimerBanner.jsx # Bannière d'avertissement IA
│   │   ├── context/
│   │   │   └── ThemeContext.jsx     # Contexte de gestion de thème clair / sombre
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        # Page de connexion (Email/Mot de passe & Google)
│   │   │   ├── RegisterPage.jsx     # Page d'inscription
│   │   │   ├── ChatPage.jsx         # Page principale de discussion
│   │   │   └── AdminPage.jsx        # Page d'administration & indexation PDF
│   │   ├── services/
│   │   │   └── api.js               # Client Axios & intercepteurs JWT
│   │   ├── App.jsx                  # Routeur principal React Router
│   │   ├── index.css                # Styles globaux, polices & Tailwind CSS
│   │   └── main.jsx                 # Point d'entrée React & Google OAuth Provider
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── tests/
│   ├── test_backend.py      # Tests unitaires et d'intégration du backend
│   ├── test_diag.py         # Script de diagnostic de l'API et de la clé Gemini
│   ├── test_find_model.py   # Test de connectivité et sélection du modèle LLM
│   ├── test_live.py         # Tests d'intégration en direct de l'API FastAPI
│   └── test_models.py       # Liste et test des modèles Gemini disponibles
├── render.yaml              # Configuration de déploiement automatique Render
└── README.md
```

---

## 🛠️ Technologies

| Composant | Technologies |
|-----------|-------------|
| **Backend** | FastAPI, SQLAlchemy, PostgreSQL, pgvector, Google GenAI SDK, SMTPLib |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, Lucide Icons, React Markdown |
| **IA & RAG** | Gemini 3.6 Flash (LLM), gemini-embedding-001 (Embeddings 768d), pgvector |
| **Authentification** | Google OAuth 2.0 (`@react-oauth/google`, `google-auth`), JWT (`python-jose`), bcrypt (`passlib`) |
| **Notifications** | Gmail SMTP sécurisé (MIME HTML / TLS) |

---

*Développé pour la soutenance de projet — République du Mali 🇲🇱*
