import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user
from app.services.rag_pipeline import answer_question, retrieve_rag_context
from app.services.llm_client import generate_answer_stream, AVAILABLE_MODELS
from app.routers.auth import log_activity
from app.config import settings

logger = logging.getLogger(__name__)

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


@router.post("/ask-stream")
def ask_stream(payload: schemas.AskRequest, db: Session = Depends(get_db),
               current_user: models.User = Depends(get_current_user)):
    """
    Server-Sent Events (SSE) streaming endpoint.
    Streams tokens in real time (TTFT ~200ms) with low latency.
    """
    if current_user.is_guest:
        if current_user.guest_query_count >= settings.GUEST_MAX_QUERIES:
            raise HTTPException(
                status_code=403,
                detail=f"Guest limit reached ({settings.GUEST_MAX_QUERIES} questions). Please create a free account to save your conversation history and continue querying."
            )

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

    user_msg = models.ChatMessage(session_id=session.id, role="user", content=payload.question)
    db.add(user_msg)
    db.commit()

    top_chunks, sources, primary_doc_name = retrieve_rag_context(
        db, current_user.id, payload.question, payload.document_id
    )

    def event_generator():
        from app.database import SessionLocal
        bg_db = SessionLocal()
        try:
            bg_user = bg_db.query(models.User).filter(models.User.id == current_user.id).first()
            if not top_chunks:
                empty_msg = "I couldn't find any relevant content in your uploaded documents to answer this question."
                meta_payload = {
                    "session_id": session.id,
                    "document_name": None,
                    "sources": [],
                    "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                }
                yield f"event: meta\ndata: {json.dumps(meta_payload)}\n\n"
                yield f"event: delta\ndata: {json.dumps({'text': empty_msg})}\n\n"
                yield "event: done\ndata: [DONE]\n\n"

                asst_msg = models.ChatMessage(
                    session_id=session.id,
                    role="assistant",
                    content=empty_msg,
                    document_name=None,
                    tokens_used=meta_payload["tokens_used"],
                    sources=[],
                )
                bg_db.add(asst_msg)
                if bg_user and bg_user.is_guest:
                    bg_user.guest_query_count = (bg_user.guest_query_count or 0) + 1
                bg_db.commit()
                return

            meta_payload = {
                "session_id": session.id,
                "document_name": primary_doc_name,
                "sources": sources,
            }
            yield f"event: meta\ndata: {json.dumps(meta_payload)}\n\n"

            accumulated_answer = ""
            final_tokens = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

            for event_type, data in generate_answer_stream(payload.question, top_chunks, model_name=payload.model):
                if event_type == "token":
                    accumulated_answer += data
                    yield f"event: delta\ndata: {json.dumps({'text': data})}\n\n"
                elif event_type == "done":
                    full_text, tokens = data
                    accumulated_answer = full_text or accumulated_answer
                    final_tokens = tokens
                    yield f"event: done\ndata: {json.dumps({'tokens_used': final_tokens})}\n\n"

            asst_msg = models.ChatMessage(
                session_id=session.id,
                role="assistant",
                content=accumulated_answer,
                document_name=primary_doc_name,
                tokens_used=final_tokens,
                sources=sources,
            )
            bg_db.add(asst_msg)

            if bg_user:
                bg_user.prompt_tokens = (bg_user.prompt_tokens or 0) + final_tokens.get("prompt_tokens", 0)
                bg_user.completion_tokens = (bg_user.completion_tokens or 0) + final_tokens.get("completion_tokens", 0)
                bg_user.total_tokens = (bg_user.total_tokens or 0) + final_tokens.get("total_tokens", 0)
                if bg_user.is_guest:
                    bg_user.guest_query_count = (bg_user.guest_query_count or 0) + 1

            bg_db.commit()
            log_activity(bg_db, current_user.id, "ask_question_stream", details=payload.question[:200])

        except Exception as e:
            logger.error(f"Error in ask_stream generator: {e}")
            yield f"event: delta\ndata: {json.dumps({'text': ' [Stream interrupted]'})}\n\n"
            yield "event: done\ndata: [DONE]\n\n"
        finally:
            bg_db.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
