# 🇲🇱 Guide Explicatif du Frontend — AssistantJuridique MALI

Ce document fournit une explication technique détaillée du fonctionnement, de la structure et des composants du frontend de l'application **AssistantJuridique MALI**.

---

## 🏗️ Architecture Globale & Technologies

Le frontend est une application monopage (SPA) construite avec :
* **React 18** : Pour la structure en composants et la gestion de l'état.
* **Vite 5** : Comme outil de build ultra-rapide et serveur de développement.
* **Tailwind CSS 3** : Pour le stylisage moderne, réactif et basé sur des classes utilitaires (couleurs adaptées au drapeau malien, thème sombre profond).
* **React Router Dom 6** : Pour la gestion de la navigation et des redirections.
* **Axios** : Pour effectuer les requêtes HTTP vers le backend FastAPI.
* **Lucide React** : Pour un catalogue d'icônes vectorielles modernes et épurées.
* **React Markdown & Remark GFM** : Pour le rendu riche des réponses juridiques générées par l'IA.

---

## 📁 Structure des Fichiers du Frontend

```
frontend/
├── src/
│   ├── components/
│   │   ├── ChatWindow.jsx       # Fenêtre de chat (Saisie, Rendu Markdown, Sources)
│   │   ├── DisclaimerBanner.jsx # Avertissement légal sur l'utilisation de l'IA
│   │   ├── Sidebar.jsx          # Barre de navigation latérale (Historique, Accès Admin)
│   │   └── SourceCard.jsx       # Carte individuelle pour une source juridique
│   ├── pages/
│   │   ├── AdminPage.jsx        # Panel Admin (Upload PDF & Gestion des Utilisateurs)
│   │   ├── ChatPage.jsx         # Layout principal assemblant la Sidebar et le Chat
│   │   ├── LoginPage.jsx        # Écran de connexion
│   │   └── RegisterPage.jsx     # Écran d'inscription
│   ├── services/
│   │   └── api.js               # Configuration Axios, Intercepteurs & Appels API
│   ├── App.jsx                  # Configuration du routeur et des gardes d'accès
│   ├── index.css                # Styles globaux, polices de caractères et variables Tailwind
│   └── main.jsx                 # Point d'entrée React (Montage dans le DOM)
├── package.json                 # Dépendances et scripts de démarrage npm
├── tailwind.config.js           # Configuration personnalisée de la charte graphique Tailwind
└── vite.config.js               # Proxy de développement pour contourner le CORS
```

---

## 🚦 Configuration des Routes & Gardes (`App.jsx`)

Le composant `App.jsx` structure l'application et sécurise les accès selon le profil utilisateur :
1. **Restauration de Session** : Au démarrage, l'application vérifie si un jeton JWT (`token`) et les infos utilisateur (`user`) sont présents dans le `localStorage`.
2. **Garde d'Authentification (Routes Privées)** :
   * La route `/chat` exige un utilisateur connecté. Sinon, redirection automatique vers `/login`.
   * La route `/admin` exige que l'utilisateur soit connecté ET qu'il ait le statut d'administrateur (`user.is_admin === true`). Sinon, redirection vers `/chat`.
3. **Redirections des Routes Publiques** : Si un utilisateur déjà connecté tente d'accéder à `/login` ou `/register`, il est automatiquement redirigé vers `/chat`.

---

## 🔌 Gestion de l'API & Intercepteurs (`services/api.js`)

Toutes les interactions avec le serveur backend FastAPI transitent par l'instance configurée d'**Axios** :
* **Proxy de développement** : Dans `vite.config.js`, un proxy redirige les requêtes de `/api` vers `http://localhost:8000/api`. Cela évite les restrictions CORS en local.
* **Intercepteur de Requête** : Avant chaque envoi, l'intercepteur injecte automatiquement le token JWT présent dans le `localStorage` dans l'en-tête HTTP :
  `headers.Authorization = "Bearer <token>"`
* **Intercepteur de Réponse** : Si le backend retourne un code d'erreur `401 Unauthorized` (indiquant que le token a expiré ou a été révoqué, ou que l'utilisateur est bloqué), l'intercepteur nettoie automatiquement le `localStorage` et redirige le navigateur vers `/login`.

---

## 📄 Les Pages Principales (`pages/`)

### 1. LoginPage & RegisterPage
* Fournissent des formulaires épurés avec des validations de base.
* Affichent des alertes dynamiques en cas d'identifiants incorrects, d'adresses email déjà prises, ou de mots de passe trop courts.
* À la validation, elles enregistrent le jeton JWT et les données de l'utilisateur en local puis mettent à jour l'état global pour initier la redirection.

### 2. ChatPage
* Sert de layout principal pour la discussion.
* Assemble la `Sidebar` (sur le côté gauche) et la `ChatWindow` (sur la droite).
* Gère l'état de la conversation active (`activeConversationId`). Si cet ID est `null`, l'utilisateur se trouve dans l'état "Nouvelle Discussion".
* Gère un interrupteur réactif (`refreshTrigger`) pour forcer la `Sidebar` à recharger la liste des conversations récentes après qu'une nouvelle discussion a été créée.

### 3. AdminPage (Mis à jour 🚀)
Le panneau d'administration est structuré en **deux onglets distincts** :

* **Onglet "Documents"** :
  * **Upload de PDF** : Un formulaire permet d'importer une loi malienne (Titre + fichier PDF). Un bouton déclenche le traitement et affiche une icône de chargement asynchrone (Spinner).
  * **Liste des Textes Indexés** : Affiche les documents présents dans la base vectorielle avec la date d'importation, le fichier d'origine et le nombre total de fragments (chunks) créés.
  * **Bouton de Suppression** : Permet de supprimer définitivement un texte et ses données vectorielles de la base de données.
* **Onglet "Utilisateurs" (Nouveau 🌟)** :
  * **Barre de Statistiques** : Donne une vue synthétique instantanée du nombre total d'utilisateurs inscrits, des membres actifs et du nombre d'administrateurs.
  * **Liste enrichie** : Affiche chaque utilisateur avec ses statistiques (nombre de discussions créées, messages posés à l'IA) et sa date d'inscription.
  * **Boutons d'Action Rapide** :
    1. *Promouvoir/Rétrograder (Couronne/Bouclier)* : Bascule le rôle d'un utilisateur entre citoyen classique et administrateur.
    2. *Activer/Suspendre (Bouton d'exclusion)* : Permet de bloquer immédiatement l'accès d'un compte (il sera bloqué sur le champ à sa prochaine action).
    3. *Supprimer définitivement (Poubelle)* : Supprime le compte et l'ensemble de son historique de discussion.
  * **Sécurités intégrées** : Les boutons d'action sont **désactivés** sur la ligne représentant l'administrateur actuellement connecté pour éviter qu'il ne se bloque lui-même ou ne supprime son propre compte par mégarde.

---

## 🧩 Les Composants Réutilisables (`components/`)

### 1. Sidebar
* **Navigation mobile** : Gère un état d'ouverture coulissant réactif pour les smartphones à l'aide d'un bouton burger.
* **Nouvelle Discussion** : Un bouton permet de réinitialiser instantanément l'état pour ouvrir un chat vide.
* **Historique** : Liste toutes les anciennes discussions de l'utilisateur avec un bouton de suppression rapide pour chacune.
* **Profil Utilisateur** : Affiche les informations de session au bas de la barre, avec un bouton de déconnexion.

### 2. ChatWindow (Mis à jour 🚀)
Gère l'interface de discussion interactive :
* **Zone vide (suggestions)** : Si aucune question n'a été posée, le composant propose 4 exemples de questions sémantiques cliquables sur le droit malien pour guider l'utilisateur.
* **Défilement automatique** : Utilise une référence React (`useRef`) vers un élément vide au bas du fil de discussion, pour y scroller automatiquement à chaque nouveau message reçu.
* **Saisie adaptative** : Le champ de saisie (`textarea`) calcule sa propre hauteur dynamiquement en fonction du volume de texte écrit par l'utilisateur (jusqu'à une hauteur maximale de 120 pixels).
* **Rendu Markdown (Nouveau 🌟)** :
  Le composant intègre le parseur `ReactMarkdown` avec l'extension `RemarkGFM` pour rendre lisibles et esthétiques les réponses de l'IA (qui contiennent des listes, des titres, du gras et des citations).
  Il surcharge le style par défaut du HTML avec des classes sur mesure :
  * Les titres (`h1`, `h2`, `h3`) s'affichent avec des tailles harmonieuses en blanc.
  * Les listes (`ul`, `ol`) ont des puces bien alignées.
  * Les citations (`blockquote`) ont une bordure verte mali.
  * Les morceaux de code (`code`) s'affichent avec une police à espacement fixe (monospace) sur fond sombre.
* **Sources Légales** : Si le message de l'IA contient des sources juridiques, elles sont affichées au bas de la bulle sous forme de cartes structurées.

### 3. SourceCard
* Affiche un fragment de loi utilisé par le backend pour formuler la réponse de l'IA.
* Indique le titre de la loi d'origine (ex: "Constitution du Mali"), la référence de l'article (ex: "Article 4") et l'extrait brut du texte.
* Permet à l'utilisateur de cliquer sur un bouton d'extension pour lire l'extrait complet du fragment de loi directement dans le chat.

### 4. DisclaimerBanner
* Affiche une bannière d'avertissement légal rappelant à l'utilisateur que l'outil est une intelligence artificielle d'aide et qu'il ne remplace pas les conseils officiels d'un avocat ou d'un juriste professionnel.
* S'adapte dynamiquement en taille classique ou en format compact selon l'espace disponible.
