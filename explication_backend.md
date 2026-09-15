# 🇲🇱 Guide Explicatif du Backend — AssistantJuridique MALI

Ce document fournit une explication technique détaillée de tous les modules, configurations et services constituant le backend de l'application **AssistantJuridique MALI**.

---

## 🏗️ Architecture Globale & Flux de Données

Le backend est propulsé par **FastAPI** pour l'API REST, **SQLAlchemy** pour l'ORM (Object-Relational Mapping), **PostgreSQL** avec l'extension **pgvector** pour le stockage de vecteurs et la recherche sémantique, et l'API **Google Gemini** pour la génération d'embeddings et le raisonnement LLM.

### Schéma du flux RAG (Retrieval-Augmented Generation)

```
[Client Frontend]
       │
       │ (1. Pose une question: POST /api/chat/ask)
       ▼
[Routeur FastAPI (chat.py)] ────(2. Vectorise la question)────► [Service RAG (generate_embedding)]
       │                                                                      │
       │                                                      (3. Requête gemini-embedding-001)
       │                                                                      ▼
       │                                                            [API Google Gemini]
       │                                                                      │
       │                                                          (4. Vecteur dim 768)
       │                                                                      ▼
       │◄──────────────(6. Récupère les 4 extraits les plus proches)─ [Service RAG (generate_embedding)]
       │                                                                      ▲
       │                                                                      │
       │                                                    (5. Distance cosinus sémantique <=>)
       │                                                                      │
       ▼                                                                      ▼
[Routeur FastAPI (chat.py)] ───────────────────────────────► [Base PostgreSQL + pgvector]
       │
       │ (7. Prompt structuré + Extraits)
       ▼
[Service RAG (generate_legal_response)]
       │
       │ (8. Génération de la réponse finale)
       ▼
[API Google Gemini (gemini-3.6-flash)]
       │
       │ (9. Réponse rédigée + citations)
       ▼
[Service RAG (generate_legal_response)]
       │
       │ (10. Sauvegarde la discussion)
       ▼
[Base PostgreSQL + pgvector]
       │
       │ (11. Réponse finale JSON retournée)
       ▼
[Client Frontend]
```

---

## 📁 Structure des Fichiers du Backend

```
backend/
├── app/
│   ├── api/
│   │   ├── admin.py         # Routes d'administration (Upload PDF, suppression de docs)
│   │   ├── auth.py          # Routes de gestion d'utilisateurs (JWT, Inscription/Connexion)
│   │   └── chat.py          # Routes de discussion interactive (RAG)
│   ├── core/
│   │   ├── config.py        # Configuration globale via Pydantic Settings & .env
│   │   ├── database.py      # Session de base de données PostgreSQL & Engine
│   │   └── security.py      # Hachage bcrypt & gestion des jetons JWT
│   ├── models/
│   │   └── models.py        # Définition des tables SQL (User, Document, Chunk, etc.)
│   ├── services/
│   │   ├── pdf_service.py   # Extraction brute de texte et découpage par article
│   │   └── rag_service.py   # Service d'embeddings Gemini et recherche sémantique
│   └── main.py              # Point d'entrée de l'application FastAPI (Middlewares & Startup)
├── seed_db.py               # Script autonome d'indexation batch des PDF locaux
├── requirements.txt         # Dépendances Python du backend
└── .env                     # Variables de configuration d'environnement (API Key, DB URL, etc.)
```

---

## ⚙️ Configuration & Noyau de l'Application (Dossier `core/`)

Le dossier `core` contient la fondation technique de l'application (configuration globale, connexion à la base de données PostgreSQL et fonctions de sécurité).

### 1. Configuration globale (`core/config.py`)
Ce module utilise la bibliothèque `pydantic-settings` pour définir, valider et charger les variables d'environnement requises depuis le fichier `.env`.

* **`DATABASE_URL`** : L'URL de connexion PostgreSQL (contient l'utilisateur, le mot de passe, l'hôte et le nom de la BDD).
* **`SECRET_KEY` & `ALGORITHM`** : Utilisés pour signer de manière sécurisée les jetons JWT.
* **`GEMINI_API_KEY`** : La clé secrète requise pour communiquer avec l'API Google Gemini.
* **`EMBEDDING_MODEL`** : Modèle d'embeddings utilisé (`gemini-embedding-001`), produisant des vecteurs de dimension **768**.
* **`LLM_MODEL`** : Modèle de langage utilisé (`gemini-3.6-flash`) pour formuler les réponses.
* **`UPLOAD_DIR`** : Le dossier local dans lequel sont stockés les fichiers PDF importés.

### 2. Base de données PostgreSQL (`core/database.py`)
Ce fichier initialise la connexion SQLAlchemy via le moteur (`engine`) et configure la fabrique de sessions (`SessionLocal`).
* **Optimisation de l'Engine** : Le moteur est configuré avec `pool_size=10` et `max_overflow=20` afin de réutiliser les connexions physiques et éviter les surcharges lors des requêtes concurrentes. `pool_pre_ping=True` permet de détecter automatiquement les déconnexions de base de données et de relancer la connexion si nécessaire.
* **Dépendance `get_db`** : Un générateur Python (`yield`) qui ouvre une session de base de données pour chaque requête API reçue, puis assure sa fermeture (`finally: db.close()`) une fois la requête terminée. Elle est injectée dans les routes FastAPI via `Depends(get_db)`.

### 3. Hachage & Sécurité JWT (`core/security.py`)
Ce fichier expose les utilitaires liés à l'authentification et à la protection des ressources :
* **`verify_password` / `get_password_hash`** : Utilisent la bibliothèque `passlib` avec l'algorithme `bcrypt` pour chiffrer les mots de passe avant stockage en base de données, et pour vérifier la correspondance des mots de passe en clair saisis lors de la connexion.
* **`create_access_token`** : Génère un token JWT signé contenant l'identifiant de l'utilisateur (`sub`) avec une date d'expiration (par défaut 24h, soit 1440 minutes).
* **`decode_access_token`** : Décode et valide la signature et l'expiration du jeton JWT. Elle retourne le payload décodé ou `None` en cas d'erreur de signature (`JWTError`).

---

## 🗄️ Schéma de Base de Données (`models/models.py`)

Les tables sont déclarées via le système déclaratif d'ORM de SQLAlchemy. Elles correspondent aux modèles relationnels suivants :

| Table | Modèle SQLAlchemy | Colonnes Principales | Description / Rôle |
| :--- | :--- | :--- | :--- |
| `users` | `User` | `id`, `email`, `hashed_password`, `full_name`, `is_admin` | Utilisateurs de l'application (administrateurs ou simples citoyens). |
| `documents` | `Document` | `id`, `filename`, `title`, `file_path`, `uploaded_at` | Fiches des textes de lois importés (PDF physiques stockés sur disque). |
| `document_chunks` | `DocumentChunk` | `id`, `document_id`, `content`, `article_reference`, `embedding` | Fragments de texte extraits d'un document. La colonne `embedding` contient un type `Vector(768)` indexé par pgvector. |
| `conversations` | `Conversation` | `id`, `user_id`, `title`, `created_at` | Sessions de discussion associées à un utilisateur particulier. |
| `messages` | `Message` | `id`, `conversation_id`, `role`, `content`, `sources`, `created_at` | Messages de discussion. Le champ `sources` est une colonne `JSON` qui stocke les références exactes des articles de loi consultés pour ce message. |

> **Note :** La suppression d'un utilisateur ou d'un document supprime en cascade toutes les données associées (par exemple, supprimer un document retire automatiquement tous ses fragments `document_chunks` de la base grâce à l'option de cascade ORM `cascade="all, delete-orphan"` et la contrainte de clé étrangère `ondelete="CASCADE"`).

---

## 🛠️ Les Services Cœurs (`services/`)

Les fichiers présents dans le sous-dossier `services` gèrent le traitement des documents juridiques et l'intégration avec l'intelligence artificielle (Gemini).

### 1. Service d'extraction et de découpage PDF (`services/pdf_service.py`)
La pertinence des réponses du modèle dépend fortement de la qualité du découpage initial des documents (le *chunking*).

* **`extract_text_from_pdf(file_path)`** :
  Lit le fichier PDF sur disque page par page à l'aide de `pypdf`, extrait le texte brut de chaque page, gère les retours à la ligne et les concatène.

* **`chunk_legal_text(text, document_title)`** :
  Applique un algorithme de découpage juridique intelligent et contextuel :
  1. **Découpage par article** : Utilise une expression régulière (`re.findall`) pour détecter la structure classique des textes juridiques maliens : `Art. 1`, `Article 2`, etc.
  2. **Extraction de la référence d'article** : Si des articles sont détectés, le service extrait automatiquement la référence textuelle (ex: `Article 12` ou `Art. 42`) pour chaque fragment.
  3. **Sous-découpage** : Si un article est trop long (plus de 2 000 caractères), il est sous-découpé en blocs sémantiques de maximum 1 500 caractères basés sur les fins de phrases (points, points d'exclamation, etc.) grâce à la fonction utilitaire privée `_split_long_text`. Cela évite d'excéder la taille maximale des fenêtres de contexte ou d'avoir des embeddings trop dilués.
  4. **Repli (Fallback) par paragraphes** : Si le PDF ne contient pas d'articles structurés (par exemple, une introduction générale ou une circulaire), le texte est splité par paragraphes (`\n\n`) et regroupé en blocs de maximum 1 500 caractères.

### 2. Service RAG et Embeddings (`services/rag_service.py`)
Ce service pilote l'interaction avec l'API Google Gemini et le stockage vectoriel de pgvector.

* **`generate_embedding(content)`** :
  Envoie le texte brut au modèle `gemini-embedding-001` de Google Gemini (SDK unifié `google-genai`) avec `output_dimensionality=768` pour générer une représentation vectorielle sous forme de liste de 768 dimensions.
  > **Important :** Le service gère l'exception de quota au cas où la clé d'API atteint sa limite de quota gratuit, en levant une erreur `503` avec un message clair incitant l'utilisateur à patienter.

* **`store_chunk_with_embedding`** :
  Fait le lien en appelant `generate_embedding` pour un fragment puis en le persistant dans `document_chunks` de la BDD.

* **`search_similar_chunks(db, query, k=4)`** :
  C'est le cœur de la recherche sémantique :
  1. Il génère l'embedding de la question posée par l'utilisateur.
  2. Il exécute une requête SQL brute avec SQLAlchemy. Cette requête calcule la **distance cosinus** entre l'embedding de la question et l'embedding de chaque fragment stocké en BDD à l'aide de l'opérateur de distance cosinus de pgvector : `<=>`.
  3. Elle classe les résultats du plus proche (distance la plus faible) au plus éloigné, effectue une jointure (`JOIN`) avec la table `documents` pour récupérer le nom du fichier et son titre sémantique, et limite le résultat aux `k` meilleurs fragments (ici, 4).

* **`generate_legal_response(query, context_chunks)`** :
  Génère la réponse finale du modèle :
  1. Si aucun fragment pertinent n'est récupéré s'ils ont une distance trop élevée ou si la base de documents est vide, le service retourne immédiatement un message poli indiquant qu'aucun texte de loi n'a été trouvé.
  2. Sinon, il assemble les 4 extraits dans un contexte formaté en précisant pour chacun son titre de loi et son article.
  3. Il applique un **prompt d'ingénierie strict** forçant le LLM Gemini (`gemini-1.5-flash`) à se comporter comme un assistant juridique malien qui a l'interdiction d'inventer du contenu ou de se baser sur des connaissances externes (les hallucinations sont ainsi bloquées), et qui a l'obligation de mentionner ses sources pour chaque affirmation.

---

## 🚦 Les Points d'Entrée API (`api/`)

FastAPI expose les endpoints HTTP structurés en 3 routeurs distincts, regroupés et inclus dans l'instance principale de l'application dans `backend/app/main.py`.

### 1. Authentification (`api/auth.py`)
Gère les accès sécurisés des utilisateurs.

* **Inscription (`POST /api/auth/register`)** :
  Prend l'adresse email (qu'il nettoie et normalise en minuscules), le mot de passe (doit faire 6 caractères minimum) et le nom complet. Il vérifie l'absence de doublons dans la table `users`, enregistre l'utilisateur avec son mot de passe haché par bcrypt, configure par défaut le statut actif (`is_active=True`), enregistre la date d'inscription (`created_at`), génère son jeton JWT et le retourne pour le connecter automatiquement.
* **Connexion (`POST /api/auth/login`)** :
  Vérifie les informations saisies contre le mot de passe haché en BDD et retourne un token JWT en cas de correspondance.
* **Profil (`GET /api/auth/me`)** :
  Retourne les informations de l'utilisateur connecté (ID, email, nom complet et privilèges d'administration).
* **Dépendance d'authentification (`get_current_user`)** :
  Fonction utilitaire injectée dans tous les endpoints sécurisés. Elle extrait le jeton JWT de l'en-tête de requête (`Authorization: Bearer <token>`), le décode, valide l'existence de l'utilisateur en base de données.
  * **Vérification du statut d'activité** : Elle vérifie également si le compte n'a pas été suspendu (`not user.is_active`). Si l'utilisateur est bloqué, elle lève immédiatement une exception `403 Forbidden` bloquant tout accès subséquent, même si son jeton JWT est valide.
* **Dépendance d'accès admin (`require_admin`)** :
  Utilise `get_current_user` et s'assure en plus que le drapeau `is_admin` de l'utilisateur est égal à `True`. Lève une exception `403 Forbidden` si l'utilisateur n'est pas administrateur.

### 2. Administration (`api/admin.py`)
Ce routeur est sécurisé par la dépendance `require_admin`. Tous ses endpoints exigent des privilèges d'administrateur.

#### Gestion de la Base Documentaire :
* **Upload (`POST /api/admin/upload`)** :
  1. Reçoit un fichier (doit être un fichier d'extension `.pdf`) et son titre.
  2. Enregistre le PDF physique dans le dossier `uploads/`.
  3. Crée l'enregistrement dans la table `documents`.
  4. Extrait le texte et le découpe en chunks.
  5. Calcule l'embedding de chaque fragment et le stocke.
  * **Mécanisme de sécurité transactionnelle** : Si le processus d'indexation ou de calcul d'embeddings échoue à mi-chemin (par exemple si les quotas de la clé d'API Gemini sont coupés pendant le processus), le service procède automatiquement au nettoyage : l'enregistrement du document est annulé en BDD (`db.rollback()`) et le fichier physique est supprimé pour éviter la présence de données corrompues ou orphelines.
* **Liste des documents (`GET /api/admin/documents`)** :
  Retourne la liste de tous les documents indexés en BDD avec, pour chacun, le nombre de fragments sémantiques créés.
* **Suppression (`DELETE /api/documents/{document_id}`)** :
  Supprime le PDF physique du disque dur et retire l'enregistrement de document en BDD. Grâce à la cascade SQLAlchemy, tous les chunks associés sont supprimés en cascade.

#### Gestion des Utilisateurs :
* **Liste des utilisateurs (`GET /api/admin/users`)** :
  Renvoie la liste complète des comptes de la base de données avec leurs détails (Nom, Email, Rôles, Date d'inscription), ainsi que des statistiques calculées à la volée (le nombre total de conversations créées et de messages envoyés par chaque utilisateur).
* **Bascule de Rôle (`PATCH /api/admin/users/{user_id}/toggle-admin`)** :
  Permet d'accorder ou de révoquer les droits d'administration à un utilisateur. Une sécurité empêche l'administrateur de révoquer ses propres droits.
* **Bascule d'Activité (`PATCH /api/admin/users/{user_id}/toggle-active`)** :
  Permet de bloquer ou de débloquer (suspendre) un compte utilisateur. Si le compte est suspendu, l'utilisateur est déconnecté et bloqué à sa prochaine action. L'admin ne peut pas suspendre son propre compte.
* **Suppression définitive (`DELETE /api/admin/users/{user_id}`)** :
  Supprime définitivement un compte utilisateur ainsi que l'ensemble de ses conversations et messages associés (grâce à la cascade en cascade SQL). L'admin ne peut pas supprimer son propre compte depuis cette interface.

### 3. Chat RAG (`api/chat.py`)
Gère l'interaction sémantique avec l'utilisateur.

* **Poser une question (`POST /api/chat/ask`)** :
  C'est le point d'entrée principal pour la consultation de l'assistant :
  1. Il accepte une question textuelle et un `conversation_id` optionnel.
  2. Si le `conversation_id` n'est pas fourni, le routeur crée une nouvelle session de discussion (`Conversation`) en utilisant le début de la question (les 40 premiers caractères) comme titre par défaut.
  3. Il enregistre le message de l'utilisateur.
  4. **Récupération de l'historique** : Il va interroger la table `messages` pour récupérer les échanges précédents de cette conversation, pour les formatter et les préparer sous forme de liste JSON.
  5. Il appelle `search_similar_chunks` pour effectuer la recherche de distance cosinus et retrouver les 4 extraits les plus pertinents.
  6. Il appelle `generate_legal_response` pour obtenir la réponse sémantique rédigée par Gemini, en lui passant **la question actuelle, les extraits de lois et l'historique récent**.
  7. Il prépare et formate les sources (titre du document, article de référence et extrait de contenu limité à 500 caractères) et les enregistre avec le message de l'assistant au format JSON en BDD.
  8. Il retourne la réponse et les sources.
* **Historique des conversations (`GET /api/chat/conversations`)** :
  Retourne la liste des sessions de discussion de l'utilisateur connecté, triée de la plus récente à la plus ancienne.
* **Détail d'une conversation (`GET /api/chat/conversations/{conversation_id}`)** :
  Renvoie tous les messages (l'historique complet) d'une discussion donnée, avec les rôles associés (`user` / `assistant`) et les sources consultées. Il s'assure d'abord que la session appartient bien à l'utilisateur authentifié pour empêcher les accès croisés illicites.
* **Suppression d'une conversation (`DELETE /api/chat/conversations/{conversation_id}`)** :
  Supprime une session de chat et tous ses messages associés.

---

## ⚡ Indexation Autonome en Batch (`seed_db.py`)

C'est un script Python utilitaire autonome conçu pour peupler initialement le système en local sans passer par l'interface d'administration :

1. **Parcours du dossier** : Il recherche les fichiers PDF présents dans `backend/uploads/`.
2. **Détection des doublons** : Pour chaque PDF trouvé, il vérifie en base s'il est déjà indexé pour ne pas ré-analyser inutilement.
3. **Indexation par Batch** : Au lieu d'appeler l'API Gemini un par un pour chaque fragment (ce qui serait lent et risquerait de saturer les limites de requêtes), le script regroupe les fragments par **batch de 30** et utilise l'appel optimisé `genai.embed_content()`.
4. **Temporisation sémantique** : Il insère un délai de repos de 2 secondes (`time.sleep(2.0)`) entre chaque batch pour respecter les quotas de taux limite de requêtes par minute de la version d'évaluation gratuite de Google Gemini.
5. **Repli en mode un par un** : En cas d'erreur générale sur un batch, il bascule automatiquement en mode un par un sur ces 30 fragments, appliquant une pause d'une seconde par fragment pour assurer l'indexation de la majeure partie des textes sans planter le script.

---

## 🚀 Démarrage et Point d'Entrée (`backend/app/main.py`)

C'est le fichier exécuté par le serveur de développement Uvicorn.
* **Configuration CORS** : Il configure les en-têtes CORS (`CORSMiddleware`) pour autoriser les requêtes asynchrones en provenance du port du frontend React (`http://localhost:5173`).
* **Initialisation Automatique lors du Startup (`@app.on_event("startup")`)** :
  1. Il se connecte en base de données et s'assure que l'extension sémantique `vector` de pgvector est bien créée : `CREATE EXTENSION IF NOT EXISTS vector`.
  2. Il applique la création de toutes les tables SQLAlchemy manquantes.
  3. **Création / Mise à jour du compte administrateur automatique** : Il insère ou réinitialise par défaut un compte administrateur avec les accès suivants :
     * **Identifiant** : `fayesidi86@gmail.com`
     * **Mot de passe** : `faye5fayeS`
     Ce compte permet de s'identifier directement sur la page d'administration (`/admin`) dès le premier lancement pour téléverser de nouvelles lois ou gérer le catalogue.

