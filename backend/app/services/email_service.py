import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_login_notification(
    user_email: str,
    user_name: str,
    login_method: str = "Connexion standard",
    client_ip: str = "Inconnue",
    user_agent: str = "Inconnu",
):
    """
    Envoie un email de notification à l'administrateur lors de la connexion d'un utilisateur.
    Exécuté de manière asynchrone en arrière-plan (BackgroundTasks).
    """
    if not settings.EMAIL_NOTIFICATIONS_ENABLED:
        logger.info("Les notifications par email sont désactivées (EMAIL_NOTIFICATIONS_ENABLED=False).")
        return

    recipient = settings.ADMIN_NOTIFICATION_EMAIL or "fayesidi86@gmail.com"
    smtp_user = settings.SMTP_USER
    smtp_password = settings.SMTP_PASSWORD
    from_email = settings.SMTP_FROM_EMAIL or smtp_user or "noreply@assistantjuridiquemali.ml"

    if not smtp_user or not smtp_password:
        logger.warning(
            "Configuration SMTP incomplète (SMTP_USER ou SMTP_PASSWORD manquant dans .env). "
            f"Notification de connexion non envoyée pour l'utilisateur {user_email} ({user_name})."
        )
        return

    now_str = datetime.now().strftime("%d/%m/%Y à %H:%M:%S")

    subject = f"🔔 Connexion utilisateur : {user_name} ({user_email})"

    # Version Texte Brut (Fallback)
    text_content = f"""Bonjour,

Une nouvelle connexion a été enregistrée sur Assistant Juridique MALI.

Détails de l'utilisateur :
- Nom complet : {user_name}
- Adresse email : {user_email}
- Date et heure : {now_str}
- Méthode d'accès : {login_method}
- Adresse IP : {client_ip}
- Navigateur / Appareil : {user_agent}

Cet email a été envoyé automatiquement par la plateforme Assistant Juridique MALI.
"""

    # Version HTML soignée avec charte graphique Mali
    html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification de connexion</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #1e293b;
      margin: 0;
      padding: 24px;
    }}
    .container {{
      max-width: 580px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
    }}
    .header {{
      background: linear-gradient(135deg, #14B83E 0%, #0F9430 100%);
      padding: 24px;
      text-align: center;
      color: #ffffff;
    }}
    .flag-bar {{
      height: 4px;
      display: flex;
    }}
    .flag-green {{ background-color: #14B83E; flex: 1; }}
    .flag-gold {{ background-color: #FCD116; flex: 1; }}
    .flag-red {{ background-color: #CE1126; flex: 1; }}
    .content {{
      padding: 28px 24px;
    }}
    .badge {{
      display: inline-block;
      padding: 6px 12px;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 13px;
      font-weight: 600;
      border-radius: 9999px;
      margin-bottom: 16px;
    }}
    .info-card {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
    }}
    .info-row {{
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #edf2f7;
      font-size: 14px;
    }}
    .info-row:last-child {{
      border-bottom: none;
    }}
    .info-label {{
      color: #64748b;
      font-weight: 500;
    }}
    .info-value {{
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }}
    .footer {{
      background: #f8fafc;
      padding: 16px 24px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="flag-bar">
      <div class="flag-green"></div>
      <div class="flag-gold"></div>
      <div class="flag-red"></div>
    </div>
    
    <div class="header">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Assistant Juridique MALI</h2>
      <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">Système d'Alerte de Sécurité</p>
    </div>

    <div class="content">
      <div class="badge">🔔 Nouvelle Connexion Détectée</div>
      <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a;">Un utilisateur vient de se connecter</h3>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.5;">
        Voici les informations relatives à la session qui vient d'être initiée sur votre plateforme :
      </p>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">👤 Nom complet :</span>
          <span class="info-value">{user_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">📧 Adresse Email :</span>
          <span class="info-value" style="color: #14B83E;">{user_email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">🕒 Date et Heure :</span>
          <span class="info-value">{now_str}</span>
        </div>
        <div class="info-row">
          <span class="info-label">🔑 Méthode d'accès :</span>
          <span class="info-value">{login_method}</span>
        </div>
        <div class="info-row">
          <span class="info-label">🌐 Adresse IP :</span>
          <span class="info-value">{client_ip}</span>
        </div>
        <div class="info-row">
          <span class="info-label">💻 Appareil / Client :</span>
          <span class="info-value" style="max-width: 260px; word-break: break-all; font-size: 12px;">{user_agent}</span>
        </div>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 16px;">
        Si vous n'êtes pas à l'origine de cette session ou si vous remarquez une activité anormale, vous pouvez suspendre le compte depuis le panneau d'administration.
      </p>
    </div>

    <div class="footer">
      Assistant Juridique MALI • Notification automatique sécurisée
    </div>
  </div>
</body>
</html>
"""

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = recipient

        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")

        msg.attach(part1)
        msg.attach(part2)

        # Envoi via SMTP
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(from_email, [recipient], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(from_email, [recipient], msg.as_string())

        logger.info(f"Notification de connexion envoyée avec succès à {recipient} pour {user_email}.")
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de la notification email à {recipient}: {e}")
