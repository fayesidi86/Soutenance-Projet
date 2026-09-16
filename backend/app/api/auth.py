import secrets
import requests
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.models.models import User
from app.services.email_service import send_login_notification

router = APIRouter(prefix="/api/auth", tags=["Authentification"])
security_scheme = HTTPBearer()


# === Schémas Pydantic ===


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleLoginRequest(BaseModel):
    credential: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool


# === Dépendances d'authentification ===


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Extrait et valide l'utilisateur courant depuis le token JWT."""
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Votre compte a été suspendu. Veuillez contacter un administrateur.",
        )
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Vérifie que l'utilisateur courant est administrateur."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès administrateur requis",
        )
    return current_user


# === Routes ===


@router.post("/register", response_model=TokenResponse)
def register(
    data: RegisterRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Inscription d'un nouvel utilisateur."""
    # Nettoyage et normalisation de l'email
    email = data.email.strip().lower()
    full_name = data.full_name.strip()
    password = data.password

    # Validations de sécurité de base
    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le format de l'adresse email est invalide.",
        )
    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nom complet ne peut pas être vide.",
        )
    if not password or len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 6 caractères.",
        )

    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un compte avec cet email existe déjà.",
            )

        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            is_admin=False,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Envoi de la notification de nouvelle inscription / connexion
        client_ip = request.client.host if request.client else "Inconnue"
        user_agent = request.headers.get("user-agent", "Inconnu")
        background_tasks.add_task(
            send_login_notification,
            user_email=user.email,
            user_name=user.full_name,
            login_method="Nouvelle inscription (Email/Mot de passe)",
            client_ip=client_ip,
            user_agent=user_agent,
        )

        token = create_access_token(data={"sub": str(user.id)})
        return TokenResponse(
            access_token=token,
            user={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_admin": user.is_admin,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur d'inscription DB : {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'enregistrement en base de données : {str(e)}",
        )


@router.post("/login", response_model=TokenResponse)
def login(
    data: LoginRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Connexion d'un utilisateur existant."""
    email = data.email.strip().lower()
    password = data.password

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email et mot de passe requis.",
        )

    try:
        user = db.query(User).filter(User.email == email).first()

        # Initialisation automatique de secours pour l'admin si la DB est neuve
        if not user and email == "fayesidi86@gmail.com" and password == "faye5fayeS":
            user = User(
                email=email,
                hashed_password=get_password_hash(password),
                full_name="Administrateur",
                is_admin=True,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect.",
            )

        # Envoi de la notification de connexion en arrière-plan
        client_ip = request.client.host if request.client else "Inconnue"
        user_agent = request.headers.get("user-agent", "Inconnu")
        background_tasks.add_task(
            send_login_notification,
            user_email=user.email,
            user_name=user.full_name,
            login_method="Connexion standard (Email/Mot de passe)",
            client_ip=client_ip,
            user_agent=user_agent,
        )

        token = create_access_token(data={"sub": str(user.id)})
        return TokenResponse(
            access_token=token,
            user={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_admin": user.is_admin,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur lors de la connexion DB : {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la connexion en base de données : {str(e)}",
        )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Récupère le profil de l'utilisateur connecté."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_admin=current_user.is_admin,
    )


def _verify_google_token(credential: str) -> dict:
    """
    Vérifie le jeton Google ID (JWT) via google-auth ou via l'endpoint officiel tokeninfo de Google.
    Retourne les informations du compte Google certifié ou lève une HTTPException.
    """
    token_info = None

    # 1. Tentative avec la librairie google-auth
    try:
        req = google_requests.Request()
        audience = settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID else None
        token_info = id_token.verify_oauth2_token(credential, req, audience=audience)
    except Exception as e:
        print(f"Vérification google-auth échouée ({e}), tentative via tokeninfo API...")

    # 2. Secours direct via l'API officielle Google tokeninfo
    if not token_info:
        try:
            resp = requests.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": credential},
                timeout=5,
            )
            if resp.status_code == 200:
                token_info = resp.json()
        except Exception as e:
            print(f"Erreur API tokeninfo Google: {e}")

    if not token_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton Google invalide ou expiré.",
        )

    # 3. Vérifier que l'email est bien vérifié par Google
    email_verified = token_info.get("email_verified")
    if isinstance(email_verified, str):
        email_verified = email_verified.lower() in ["true", "1"]

    if not email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'adresse email Google n'a pas été vérifiée par Google.",
        )

    return token_info


@router.post("/google", response_model=TokenResponse)
def login_with_google(
    data: GoogleLoginRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Authentification ou Inscription directe avec un compte Google vérifié.
    Vérifie le token auprès de Google, crée le compte si inexistant et retourne le JWT de session.
    """
    if not data.credential:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Jeton d'identification Google manquant.",
        )

    # Vérification sécurisée auprès de Google
    google_data = _verify_google_token(data.credential)
    email = google_data.get("email", "").strip().lower()
    full_name = google_data.get("name", "").strip() or email.split("@")[0]

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de récupérer l'adresse email depuis le compte Google.",
        )

    try:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # Création automatique de l'utilisateur certifié Google
            random_pw = secrets.token_urlsafe(32)
            is_admin_user = email == "fayesidi86@gmail.com"
            user = User(
                email=email,
                hashed_password=get_password_hash(random_pw),
                full_name=full_name,
                is_admin=is_admin_user,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            login_method = "Connexion Google (Premier accès / Inscription)"
        else:
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Votre compte a été suspendu. Veuillez contacter un administrateur.",
                )
            login_method = "Connexion Google (OAuth)"

        # Envoi de la notification de connexion Google en arrière-plan
        client_ip = request.client.host if request.client else "Inconnue"
        user_agent = request.headers.get("user-agent", "Inconnu")
        background_tasks.add_task(
            send_login_notification,
            user_email=user.email,
            user_name=user.full_name,
            login_method=login_method,
            client_ip=client_ip,
            user_agent=user_agent,
        )

        token = create_access_token(data={"sub": str(user.id)})
        return TokenResponse(
            access_token=token,
            user={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_admin": user.is_admin,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur DB Google Auth: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la synchronisation de l'utilisateur Google : {str(e)}",
        )

