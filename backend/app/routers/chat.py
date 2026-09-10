from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user
from app.services.rag_pipeline import answer_question
from app.routers.auth import log_activity

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=schemas.ChatSessionOut)
def create_session(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = models.ChatSession(user_id=current_user.id, title="New Chat")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=list[schemas.ChatSessionOut])
def list_sessions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ChatSession).filter(models.ChatSession.user_id == current_user.id) \
        .order_by(models.ChatSession.created_at.desc()).all()


@router.get("/sessions/{session_id}/messages", response_model=list[schemas.ChatMessageOut])
def get_messages(session_id: str, db: Session = Depends(get_db),
                  current_user: models.User = Depends(get_current_user)):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id, models.ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session.messages


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db),
                    current_user: models.User = Depends(get_current_user)):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id, models.ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    db.delete(session)
    db.commit()
    return {"detail": "deleted"}


from app.config import settings
from app.services.llm_client import AVAILABLE_MODELS


@router.get("/models")
def get_available_models():
    """Returns list of open-source models supported on Groq's free tier."""
    return AVAILABLE_MODELS


@router.post("/ask", response_model=schemas.AskResponse)
def ask(payload: schemas.AskRequest, db: Session = Depends(get_db),
        current_user: models.User = Depends(get_current_user)):

    # Enforce guest user limit
    if current_user.is_guest:
        if current_user.guest_query_count >= settings.GUEST_MAX_QUERIES:
            raise HTTPException(
                status_code=403,
                detail=f"Guest limit reached ({settings.GUEST_MAX_QUERIES} questions). Please create a free account to save your conversation history and continue querying."
            )

    # Get or create the chat session
    if payload.session_id:
        session = db.query(models.ChatSession).filter(
            models.ChatSession.id == payload.session_id, models.ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
    else:
        session = models.ChatSession(
            user_id=current_user.id,
            title=payload.question[:60] + ("..." if len(payload.question) > 60 else ""),
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Save the user's message
    user_msg = models.ChatMessage(session_id=session.id, role="user", content=payload.question)
    db.add(user_msg)
    db.commit()

    # Run the hybrid RAG pipeline with selected open-source model
    result = answer_question(
        db,
        current_user.id,
        payload.question,
        payload.document_id,
        model_name=payload.model,
    )

    tokens = result.get("tokens_used") or {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    doc_placeholder = result.get("document_name")

    # Save the assistant's message with full retrieval trace, tokens, and filename placeholder
    assistant_msg = models.ChatMessage(
        session_id=session.id,
        role="assistant",
        content=result["answer"],
        document_name=doc_placeholder,
        tokens_used=tokens,
        sources=result["retrieved_chunks"],
    )
    db.add(assistant_msg)

    # Increment token counts on user record
    current_user.prompt_tokens = (current_user.prompt_tokens or 0) + tokens.get("prompt_tokens", 0)
    current_user.completion_tokens = (current_user.completion_tokens or 0) + tokens.get("completion_tokens", 0)
    current_user.total_tokens = (current_user.total_tokens or 0) + tokens.get("total_tokens", 0)

    if current_user.is_guest:
        current_user.guest_query_count = (current_user.guest_query_count or 0) + 1

    db.commit()

    log_activity(db, current_user.id, "ask_question", details=payload.question[:200])

    return schemas.AskResponse(
        session_id=session.id,
        answer=result["answer"],
        document_name=doc_placeholder,
        tokens_used=tokens,
        sources=result["retrieved_chunks"],
    )
