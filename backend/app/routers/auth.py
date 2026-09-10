import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.config import settings
from app.auth import hash_password, verify_password, create_access_token
from app.deps import get_current_user
from app.services.email_service import generate_otp, send_otp_email

router = APIRouter(prefix="/auth", tags=["auth"])


def log_activity(db: Session, user_id: str, action: str, details: str | None = None):
    entry = models.ActivityLog(user_id=user_id, action=action, details=details)
    db.add(entry)
    db.commit()


@router.post("/register")
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(models.User).filter(
        (models.User.email == payload.email) | (models.User.username == payload.username)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already registered")

    # Clear prior pending verifications for this email
    db.query(models.EmailVerification).filter(models.EmailVerification.email == payload.email).delete()

    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    ver = models.EmailVerification(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        otp_code=otp_code,
        expires_at=expires_at,
    )
    db.add(ver)
    db.commit()

    # Send OTP email
    send_otp_email(payload.email, otp_code)

    return {
        "message": f"Verification code sent to {payload.email}",
        "email": payload.email,
    }


@router.post("/verify-otp")
def verify_otp(payload: schemas.OTPVerifyRequest, db: Session = Depends(get_db)):
    ver = db.query(models.EmailVerification).filter(
        models.EmailVerification.email == payload.email
    ).order_by(models.EmailVerification.created_at.desc()).first()

    if not ver:
        raise HTTPException(status_code=400, detail="No pending verification found for this email")

    if ver.expires_at < datetime.utcnow():
        db.delete(ver)
        db.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired. Please register or resend.")

    if ver.otp_code != payload.otp_code.strip():
        raise HTTPException(status_code=400, detail="Incorrect verification code")

    # If first user or matches settings.ADMIN_EMAIL, assign admin role
    user_count = db.query(models.User).filter(models.User.is_guest == False).count()
    is_admin = (user_count == 0) or (bool(settings.ADMIN_EMAIL) and ver.email == settings.ADMIN_EMAIL)
    role = "admin" if is_admin else "user"

    user = models.User(
        username=ver.username,
        email=ver.email,
        hashed_password=ver.hashed_password,
        role=role,
        is_admin=is_admin,
        is_guest=False,
        is_verified=True,
    )
    db.add(user)
    db.delete(ver)
    db.commit()
    db.refresh(user)

    log_activity(db, user.id, "register_verified")

    token = create_access_token({"user_id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": schemas.UserOut.model_validate(user),
    }


@router.post("/resend-otp")
def resend_otp(payload: schemas.ResendOTPRequest, db: Session = Depends(get_db)):
    ver = db.query(models.EmailVerification).filter(
        models.EmailVerification.email == payload.email
    ).first()

    if not ver:
        raise HTTPException(status_code=400, detail="No registration found for this email. Please sign up.")

    new_otp = generate_otp()
    ver.otp_code = new_otp
    ver.expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    send_otp_email(payload.email, new_otp)
    return {"message": "New verification code sent"}


@router.post("/guest")
def start_guest_session(db: Session = Depends(get_db)):
    """Creates an ephemeral guest session for minimal usage without signing in."""
    guest_tag = str(uuid.uuid4())[:8]
    guest_user = models.User(
        username=f"Guest_{guest_tag}",
        email=f"guest_{guest_tag}@temporary.local",
        hashed_password=hash_password(str(uuid.uuid4())),
        role="guest",
        is_admin=False,
        is_guest=True,
        is_verified=False,
        guest_query_count=0,
    )
    db.add(guest_user)
    db.commit()
    db.refresh(guest_user)

    token = create_access_token({"user_id": guest_user.id}, expires_minutes=180)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": schemas.UserOut.model_validate(guest_user),
    }


@router.post("/login")
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"user_id": user.id})
    log_activity(db, user.id, "login")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": schemas.UserOut.model_validate(user),
    }


@router.post("/logout")
def logout(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Session End Hook:
    - If guest: completely erases the guest account and all data.
    - If registered user / admin: preserves chat history (with filename placeholders),
      and deletes all uploaded documents and chunks to save free DB storage.
    """
    if current_user.is_guest:
        db.delete(current_user)  # Cascades to documents, chunks, sessions, messages
        db.commit()
        return {"status": "guest_purged"}

    # Erase uploaded documents and chunks for registered user
    docs = db.query(models.Document).filter(models.Document.user_id == current_user.id).all()
    for d in docs:
        db.delete(d)  # Cascades to chunks
    db.commit()
    return {"status": "session_files_purged"}


@router.post("/guest-cleanup")
def guest_cleanup(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Erases ephemeral guest account and data when browser window is closed or guest exits."""
    if current_user.is_guest:
        db.delete(current_user)
        db.commit()
        return {"status": "guest_purged"}
    return {"status": "ignored"}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.delete("/me")
def delete_account(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Permanently deletes the current user's account and all associated data:
    - Documents & vector chunks
    - Chat sessions & messages
    - Activity logs
    - Email verification records
    - User account record
    """
    user_id = current_user.id
    user_email = current_user.email

    # 1. Purge all chunks owned by this user
    db.query(models.Chunk).filter(models.Chunk.user_id == user_id).delete(synchronize_session=False)

    # 2. Purge email verification records for this user
    if user_email:
        db.query(models.EmailVerification).filter(models.EmailVerification.email == user_email).delete(synchronize_session=False)

    # 3. Delete the user record (cascades to documents, chat_sessions, chat_messages, activity_logs)
    db.delete(current_user)
    db.commit()

    return {"status": "account_deleted", "message": "Your account and all associated data have been permanently deleted."}


@router.get("/dashboard", response_model=schemas.UserDashboardOut)
def user_dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """User personal dashboard: token metrics, questions asked, document count."""
    num_docs = db.query(models.Document).filter(models.Document.user_id == current_user.id).count()
    num_sessions = db.query(models.ChatSession).filter(models.ChatSession.user_id == current_user.id).count()
    session_ids = [s.id for s in db.query(models.ChatSession.id).filter(models.ChatSession.user_id == current_user.id).all()]
    num_messages = db.query(models.ChatMessage).filter(models.ChatMessage.session_id.in_(session_ids)).count() if session_ids else 0

    return schemas.UserDashboardOut(
        user=schemas.UserOut.model_validate(current_user),
        num_documents=num_docs,
        num_chat_sessions=num_sessions,
        num_messages=num_messages,
        prompt_tokens=current_user.prompt_tokens,
        completion_tokens=current_user.completion_tokens,
        total_tokens=current_user.total_tokens,
    )
