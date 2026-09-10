"""
Orchestrates the full hybrid RAG pipeline for a single question:

  1. Embed the query
  2. Dense retrieval  -> pgvector cosine similarity (top N candidates)
  3. Sparse retrieval -> BM25 over the same scope (top N candidates)
  4. Merge + dedupe candidates from both
  5. Rerank the merged set with a cross-encoder -> true top-k
  6. Build a grounded prompt from the top-k and call the LLM
  7. Return the answer AND the full retrieval trace (scores at every stage)
     so the frontend's retrieval-debug panel can show exactly how the
     answer was grounded.
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.services.embeddings import embed_query
from app.services.vector_store import vector_search, get_all_user_chunks
from app.services.bm25_index import bm25_search
from app.services.reranker import rerank
from app.services.llm_client import generate_answer

from app import models

CANDIDATE_POOL_SIZE = 15  # how many each of BM25/vector contribute before rerank


def answer_question(db: Session, user_id: str, question: str,
                     document_id: Optional[str] = None,
                     model_name: Optional[str] = None) -> dict:
    # --- Step 1: dense retrieval ---
    query_emb = embed_query(question)
    dense_candidates = vector_search(db, user_id, query_emb, CANDIDATE_POOL_SIZE, document_id)

    # --- Step 2: sparse retrieval (BM25) ---
    all_chunks = get_all_user_chunks(db, user_id, document_id)
    sparse_candidates = bm25_search(question, all_chunks, CANDIDATE_POOL_SIZE)

    # --- Step 3: Reciprocal Rank Fusion (RRF) to merge & rank candidates ---
    # RRF constant (standard industry default k = 60)
    RRF_K = 60
    merged: dict[str, dict] = {}

    for rank, c in enumerate(dense_candidates, start=1):
        cid = c["id"]
        merged[cid] = {**c, "dense_rank": rank, "sparse_rank": None, "rrf_score": 1.0 / (RRF_K + rank)}

    for rank, c in enumerate(sparse_candidates, start=1):
        cid = c["id"]
        rrf_contrib = 1.0 / (RRF_K + rank)
        if cid in merged:
            merged[cid]["bm25_score"] = c["bm25_score"]
            merged[cid]["sparse_rank"] = rank
            merged[cid]["rrf_score"] += rrf_contrib
        else:
            merged[cid] = {
                **c,
                "vector_score": None,
                "dense_rank": None,
                "sparse_rank": rank,
                "rrf_score": rrf_contrib,
            }

    candidates = list(merged.values())
    for c in candidates:
        c.setdefault("vector_score", None)
        c.setdefault("bm25_score", None)

    if not candidates:
        return {
            "answer": "I couldn't find any relevant content in your uploaded documents to answer this question.",
            "retrieved_chunks": [],
            "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "document_name": None,
        }

    # Fetch document filenames for placeholders
    doc_ids = {c["document_id"] for c in candidates if c.get("document_id")}
    docs = db.query(models.Document.id, models.Document.filename).filter(models.Document.id.in_(doc_ids)).all()
    doc_name_map = {d[0]: d[1] for d in docs}

    # Sort merged pool by RRF score prior to cross-encoder reranking
    candidates.sort(key=lambda c: c["rrf_score"], reverse=True)

    # --- Step 4: rerank fused candidates -> final top-k for generation ---
    top_chunks = rerank(question, candidates, settings.TOP_K_CHUNKS)

    # --- Step 5: generate grounded answer with token tracking ---
    answer, tokens_used = generate_answer(question, top_chunks, model_name=model_name)

    # Primary document name for conversation history placeholder
    primary_doc_name = None
    if document_id and document_id in doc_name_map:
        primary_doc_name = doc_name_map[document_id]
    elif top_chunks and top_chunks[0].get("document_id") in doc_name_map:
        primary_doc_name = doc_name_map[top_chunks[0]["document_id"]]

    # --- Step 6: build citation list + full retrieval trace for the debug panel ---
    sources = [{
        "chunk_id": c["id"],
        "document_id": c.get("document_id"),
        "document_name": doc_name_map.get(c.get("document_id")),
        "page_number": c.get("page_number"),
        "section": c.get("section"),
        "element_type": c.get("element_type"),
        "preview": c["content"][:200],
        "vector_score": c.get("vector_score"),
        "bm25_score": c.get("bm25_score"),
        "rrf_score": round(c.get("rrf_score", 0.0), 4),
        "rerank_score": c.get("rerank_score"),
    } for c in top_chunks]

    return {
        "answer": answer,
        "retrieved_chunks": sources,
        "tokens_used": tokens_used,
        "document_name": primary_doc_name,
    }
