"""
Dense (vector) retrieval against pgvector, plus chunk persistence.

We keep both the relational metadata (page_number, section, element_type,
document_id) and the embedding in the same `chunks` table/row -- this is
the whole point of using pgvector instead of a separate vector DB: one
database, one source of truth, joins are trivial.
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from app import models


def add_chunks(db: Session, document_id: str, user_id: str,
                chunks: List[Dict[str, Any]], embeddings: List[List[float]]) -> int:
    count = 0
    for chunk, emb in zip(chunks, embeddings):
        row = models.Chunk(
            document_id=document_id,
            user_id=user_id,
            content=chunk["content"],
            chunk_index=chunk["chunk_index"],
            page_number=chunk.get("page_number"),
            section=chunk.get("section"),
            element_type=chunk.get("element_type", "text"),
            embedding=emb,
        )
        db.add(row)
        count += 1
    db.commit()
    return count


def vector_search(db: Session, user_id: str, query_embedding: List[float],
                   top_k: int, document_id: str | None = None) -> List[Dict[str, Any]]:
    """
    Cosine-distance search via pgvector's `<=>` operator (through the
    Chunk.embedding.cosine_distance() helper). Scoped to the requesting
    user's own chunks (and optionally a single document) so retrieval never
    crosses between users.
    """
    dist_expr = models.Chunk.embedding.cosine_distance(query_embedding).label("distance")
    query = db.query(models.Chunk, dist_expr).filter(
        models.Chunk.user_id == user_id,
        models.Chunk.embedding.isnot(None)
    )

    if document_id:
        query = query.filter(models.Chunk.document_id == document_id)

    rows = query.order_by(dist_expr).limit(top_k).all()

    results = []
    for chunk, distance in rows:
        d = 0.0 if distance is None else float(distance)
        results.append({
            "id": chunk.id,
            "content": chunk.content,
            "page_number": chunk.page_number,
            "section": chunk.section,
            "element_type": chunk.element_type,
            "document_id": chunk.document_id,
            "vector_score": float(1.0 - d),  # cosine similarity = 1 - cosine distance
        })
    return results


def get_all_user_chunks(db: Session, user_id: str, document_id: str | None = None) -> List[Dict[str, Any]]:
    """Used to build the BM25 corpus for a given query scope."""
    query = db.query(models.Chunk).filter(models.Chunk.user_id == user_id)
    if document_id:
        query = query.filter(models.Chunk.document_id == document_id)
    rows = query.all()
    return [{
        "id": c.id,
        "content": c.content,
        "page_number": c.page_number,
        "section": c.section,
        "element_type": c.element_type,
        "document_id": c.document_id,
    } for c in rows]
