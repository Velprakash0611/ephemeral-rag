"""
Cross-encoder reranking -- the final precision pass of hybrid retrieval.

BM25 and vector search are both "bi-encoder" style (query and document
scored independently, then compared) which is fast but approximate. A
cross-encoder reads the (query, document) pair *together* and outputs a
single relevance score -- much more accurate, but too slow to run over an
entire corpus. So the pattern is: cheap retrieval (BM25 + vector) casts a
wide net -> expensive reranker narrows it to the true top-k -> LLM only
ever sees the reranked top-k.
"""
from functools import lru_cache
from typing import List, Dict, Any
from sentence_transformers import CrossEncoder

from app.config import settings

DEFAULT_RERANK_MODEL = "BAAI/bge-reranker-base"
FALLBACK_RERANK_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"


@lru_cache(maxsize=1)
def get_reranker() -> CrossEncoder:
    model_name = getattr(settings, "RERANK_MODEL", DEFAULT_RERANK_MODEL) or DEFAULT_RERANK_MODEL
    try:
        return CrossEncoder(model_name)
    except Exception:
        return CrossEncoder(FALLBACK_RERANK_MODEL)


def rerank(query: str, candidates: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
    if not candidates:
        return []
    model = get_reranker()
    pairs = [(query, c["content"]) for c in candidates]
    scores = model.predict(pairs)

    for c, score in zip(candidates, scores):
        c["rerank_score"] = float(score)

    candidates.sort(key=lambda c: c["rerank_score"], reverse=True)
    return candidates[:top_k]
