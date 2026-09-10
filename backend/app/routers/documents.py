import os
import shutil
import tempfile
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user
from app.config import settings
from app.services.file_parser import parse_document
from app.services.chunker import chunk_elements
from app.services.embeddings import embed_texts
from app.services.vector_store import add_chunks
from app.routers.auth import log_activity

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_TYPES = {"pdf", "docx"}


def _process_document(document_id: str, filepath: str, filetype: str, user_id: str):
    """
    Runs the full ingest pipeline: parse -> chunk -> embed -> store.
    Executed as a FastAPI BackgroundTask so the upload endpoint returns
    immediately; the frontend polls document status until it flips to
    "ready" (or "failed").
    """
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        doc = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not doc:
            return
        elements = parse_document(filepath, filetype)
        chunks = chunk_elements(elements)
        if not chunks:
            doc.status = "failed"
            doc.error_message = "No extractable content found in document."
            db.commit()
            return

        texts = [c["content"] for c in chunks]
        embeddings = embed_texts(texts)
        count = add_chunks(db, document_id, user_id, chunks, embeddings)

        doc.status = "ready"
        doc.num_chunks = count
        db.commit()
    except Exception as e:
        doc = db.query(models.Document).filter(models.Document.id == document_id).first()
        if doc:
            doc.status = "failed"
            doc.error_message = str(e)
            db.commit()
    finally:
        db.close()
        if os.path.exists(filepath):
            os.remove(filepath)


@router.post("/upload", response_model=schemas.DocumentOut)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    doc = models.Document(
        user_id=current_user.id,
        filename=file.filename,
        filetype=ext,
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    dest_path = os.path.join(settings.UPLOAD_DIR, f"{doc.id}.{ext}")
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    log_activity(db, current_user.id, "upload_document", details=file.filename)

    background_tasks.add_task(_process_document, doc.id, dest_path, ext, current_user.id)

    return doc


@router.get("", response_model=list[schemas.DocumentOut])
def list_documents(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Document).filter(models.Document.user_id == current_user.id) \
        .order_by(models.Document.uploaded_at.desc()).all()


@router.get("/{document_id}", response_model=schemas.DocumentOut)
def get_document(document_id: str, db: Session = Depends(get_db),
                  current_user: models.User = Depends(get_current_user)):
    doc = db.query(models.Document).filter(
        models.Document.id == document_id, models.Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db),
                     current_user: models.User = Depends(get_current_user)):
    doc = db.query(models.Document).filter(
        models.Document.id == document_id, models.Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)  # cascades to chunks
    db.commit()
    return {"detail": "deleted"}


@router.post("/cleanup-session")
def cleanup_session_files(db: Session = Depends(get_db),
                           current_user: models.User = Depends(get_current_user)):
    """
    Purges all uploaded documents and chunks for the user upon session close,
    ensuring vector storage stays minimal ($0 free tier safe).
    Conversation history remains preserved with filename placeholders.
    """
    docs = db.query(models.Document).filter(models.Document.user_id == current_user.id).all()
    count = len(docs)
    for d in docs:
        db.delete(d)  # Cascades to chunks
    db.commit()
    return {"status": "cleared", "purged_documents": count}
