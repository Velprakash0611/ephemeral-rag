from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not (current_user.is_admin or current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user


@router.get("/users", response_model=list[schemas.AdminUserRow])
def list_all_users(db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    """List all users (Admin, Registered, Guest) with their email, tokens used, documents, and sessions."""
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    results = []

    for u in users:
        doc_count = db.query(models.Document).filter(models.Document.user_id == u.id).count()
        session_count = db.query(models.ChatSession).filter(models.ChatSession.user_id == u.id).count()

        results.append(schemas.AdminUserRow(
            id=u.id,
            username=u.username,
            email=u.email,
            role=u.role,
            is_guest=u.is_guest,
            is_verified=u.is_verified,
            prompt_tokens=u.prompt_tokens or 0,
            completion_tokens=u.completion_tokens or 0,
            total_tokens=u.total_tokens or 0,
            num_documents=doc_count,
            num_chat_sessions=session_count,
            created_at=u.created_at,
        ))

    return results


@router.get("/stats", response_model=schemas.AdminStatsOut)
def get_system_stats(db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    """Summary metrics across all users and activities for the admin dashboard."""
    total_users = db.query(models.User).count()
    registered_users = db.query(models.User).filter(models.User.is_guest == False).count()
    guest_users = db.query(models.User).filter(models.User.is_guest == True).count()
    total_docs = db.query(models.Document).count()
    total_sessions = db.query(models.ChatSession).count()
    total_messages = db.query(models.ChatMessage).count()

    total_tokens = db.query(func.coalesce(func.sum(models.User.total_tokens), 0)).scalar() or 0

    return schemas.AdminStatsOut(
        total_users=total_users,
        registered_users=registered_users,
        guest_users=guest_users,
        total_documents=total_docs,
        total_chat_sessions=total_sessions,
        total_messages=total_messages,
        total_tokens_consumed=int(total_tokens),
    )

