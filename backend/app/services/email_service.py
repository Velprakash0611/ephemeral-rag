import secrets
import smtplib
import json
import logging
import urllib.request
import urllib.error
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from app.config import settings

logger = logging.getLogger(__name__)


def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000}"


def send_otp_email(to_email: str, otp_code: str) -> bool:
    """
    Sends the 6-digit verification code via:
    1. Brevo HTTPS API (300 free emails/day to ANY recipient, port 443), or
    2. Resend REST API (100 free emails/day), or
    3. Standard SMTP (Gmail, Brevo, SendGrid), or
    4. Console logging fallback for local development.
    """
    subject = f"Ephemeral RAG — Your Verification Code: {otp_code}"
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff; color: #0f172a; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="margin-bottom: 20px;">
            <span style="font-size: 18px; font-weight: 700; color: #4f46e5; letter-spacing: -0.5px;">Ephemeral RAG</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px;">Verify your email address</h2>
        <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-top: 0;">Use the verification code below to activate your Ephemeral RAG account. This code is valid for 10 minutes.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">{otp_code}</span>
        </div>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.4; margin-bottom: 0;">If you did not request this verification code, you can safely ignore this email.</p>
    </div>
    """

    # 1. Try Brevo HTTPS REST API (Free 300 emails/day, no custom domain required, port 443)
    if settings.brevo_key:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            sender_email = (
                settings.BREVO_SENDER_EMAIL.strip()
                or settings.SMTP_USER.strip()
                or (settings.ADMIN_EMAIL.strip() if settings.ADMIN_EMAIL else "")
                or "velprakash0611@gmail.com"
            )
            payload = {
                "sender": {"name": "Ephemeral RAG", "email": sender_email},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_content,
                "textContent": f"Your verification code is: {otp_code}",
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "api-key": settings.brevo_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "User-Agent": "EphemeralRAG/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in (200, 201, 202):
                    print(f"\n[EMAIL SUCCESS] Verification OTP sent via Brevo to: {to_email}\n")
                    logger.info(f"OTP email sent successfully via Brevo to {to_email}")
                    return True
        except urllib.error.HTTPError as e:
            raw_err = ""
            try:
                raw_err = e.read().decode("utf-8")
            except Exception:
                pass
            print(f"\n[BREVO API ERROR - HTTP {e.code}]: {raw_err or e.reason}")
            logger.warning(f"Failed to send email via Brevo: HTTP {e.code} - {raw_err}")
        except Exception as e:
            print(f"\n[BREVO API ERROR]: {e}")
            logger.warning(f"Failed to send email via Brevo: {e}")

    # 2. Try Resend API ($0 free tier)
    if settings.resend_key:
        try:
            url = "https://api.resend.com/emails"
            sender = settings.EMAIL_FROM.strip()
            # Free Resend testing domain ONLY permits onboarding@resend.dev
            if "@resend.dev" in sender and "onboarding@resend.dev" not in sender:
                sender = "Ephemeral RAG <onboarding@resend.dev>"

            payload = {
                "from": sender,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {settings.resend_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "EphemeralRAG/1.0",
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in (200, 201):
                    print(f"\n[EMAIL SUCCESS] Verification OTP sent via Resend to: {to_email}\n")
                    logger.info(f"OTP email sent successfully via Resend to {to_email}")
                    return True
        except urllib.error.HTTPError as e:
            raw_err = ""
            try:
                raw_err = e.read().decode("utf-8")
            except Exception:
                pass
            print("\n" + "!" * 60)
            print(f" [RESEND API REJECTED - HTTP {e.code}]")
            print(f" Reason: {raw_err or e.reason}")
            if e.code == 403 and "only send testing emails to your own email address" in raw_err:
                print(" -> Note: The free testing domain 'onboarding@resend.dev' can only")
                print("    deliver emails to the single email address used to register your Resend account.")
                print("    To test OTP emails with this free key, register in the app using your Resend account email,")
                print("    OR add a verified custom domain at https://resend.com/domains,")
                print("    OR configure standard Gmail SMTP in .env.")
            print("!" * 60)
            logger.warning(f"Failed to send email via Resend: HTTP {e.code} - {raw_err}")
        except Exception as e:
            print(f"\n[RESEND API ERROR]: {e}")
            logger.warning(f"Failed to send email via Resend: {e}")
    else:
        logger.info("RESEND_API_KEY is not set or empty in environment.")

    # 2. Try SMTP if configured
    if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = formataddr(("Ephemeral RAG", settings.SMTP_USER))
            msg["To"] = to_email
            msg.attach(MIMEText(f"Your verification code is: {otp_code}", "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
            print(f"\n[EMAIL SUCCESS] Verification OTP sent via SMTP to: {to_email}\n")
            logger.info(f"OTP email sent successfully via SMTP to {to_email}")
            return True
        except Exception as e:
            print(f"\n[SMTP ERROR]: {e}")
            logger.warning(f"Failed to send email via SMTP: {e}")

    # 3. Dev / Sandbox Fallback: print directly to console
    print("\n" + "=" * 60)
    print(f" [EMAIL OTP VERIFICATION] To: {to_email}")
    print(f" [CODE]: {otp_code} (Valid for 10 minutes)")
    print("=" * 60 + "\n")
    logger.info(f"[DEV FALLBACK] OTP for {to_email} is {otp_code}")
    return True

