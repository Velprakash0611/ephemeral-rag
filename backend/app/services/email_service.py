import secrets
import smtplib
import json
import logging
import urllib.request
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger(__name__)


def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000}"


def send_otp_email(to_email: str, otp_code: str) -> bool:
    """
    Sends the 6-digit verification code via:
    1. Resend REST API (100 free emails/day at $0 cost), or
    2. Standard SMTP (Gmail, Brevo, SendGrid), or
    3. Console logging fallback for local development.
    """
    subject = f"Your Contextual Verification Code: {otp_code}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #12151A; color: #E7E5E0; border-radius: 8px; border: 1px solid #23282f;">
        <h2 style="color: #F2A63A; margin-top: 0;">Contextual Document Q&A</h2>
        <p style="font-size: 14px; color: #8A8F98;">Use the verification code below to activate your account. This code is valid for 10 minutes.</p>
        <div style="background: #171B21; border: 1px solid #F2A63A; border-radius: 6px; padding: 16px; text-align: center; margin: 24px 0;">
            <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #F2A63A;">{otp_code}</span>
        </div>
        <p style="font-size: 12px; color: #8A8F98;">If you did not request this code, please ignore this email.</p>
    </div>
    """

    # 1. Try Resend API ($0 free tier)
    if settings.RESEND_API_KEY:
        try:
            url = "https://api.resend.com/emails"
            payload = {
                "from": settings.EMAIL_FROM,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in (200, 201):
                    logger.info(f"OTP email sent successfully via Resend to {to_email}")
                    return True
        except Exception as e:
            logger.warning(f"Failed to send email via Resend: {e}")

    # 2. Try SMTP if configured
    if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_USER
            msg["To"] = to_email
            msg.attach(MIMEText(f"Your verification code is: {otp_code}", "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
            logger.info(f"OTP email sent successfully via SMTP to {to_email}")
            return True
        except Exception as e:
            logger.warning(f"Failed to send email via SMTP: {e}")

    # 3. Dev / Sandbox Fallback: print directly to console
    print("\n" + "=" * 60)
    print(f" [EMAIL OTP VERIFICATION] To: {to_email}")
    print(f" [CODE]: {otp_code} (Valid for 10 minutes)")
    print("=" * 60 + "\n")
    logger.info(f"[DEV FALLBACK] OTP for {to_email} is {otp_code}")
    return True

