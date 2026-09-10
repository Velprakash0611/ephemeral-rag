"""
BM25 keyword search — the "sparse retrieval" half of hybrid search.

Built on-the-fly per query rather than persisted: for a demo-scale project
(a handful of documents per user) this is fast enough and much simpler than
maintaining an incrementally-updated index. At real production scale you'd
persist and incrementally update the index (e.g. via Elasticsearch/OpenSearch
or a library like bm25s with on-disk index) instead of rebuilding per query
-- noted here deliberately as a known scope tradeoff.
"""
from typing import List, Dict, Any
import re
from rank_bm25 import BM25Okapi


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def bm25_search(query: str, chunks: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
    """
    chunks: list of dicts each containing at least {"id", "content"}
    returns: chunks (subset, top_k) each with an added "bm25_score" key,
             sorted descending by score.
    """
    if not chunks:
        return []

    tokenized_corpus = [_tokenize(c["content"]) for c in chunks]
    bm25 = BM25Okapi(tokenized_corpus)
    scores = bm25.get_scores(_tokenize(query))

    scored = []
    for chunk, score in zip(chunks, scores):
        c = dict(chunk)
        c["bm25_score"] = float(score)
        scored.append(c)

    scored.sort(key=lambda c: c["bm25_score"], reverse=True)
    return scored[:top_k]
