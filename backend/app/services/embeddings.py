"""
Local embedding model wrapper (no external API needed — keeps cost at $0).

Uses BAAI/bge-small-en-v1.5: a small (33M param, ~130MB) sentence-transformer
that produces 384-dim embeddings. Small enough to run comfortably on a
512MB free-tier instance (e.g. Render free Web Service).
"""
from functools import lru_cache
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import settings


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    # Loaded once per process (lru_cache) and reused across requests.
    return SentenceTransformer(settings.EMBEDDING_MODEL)


def embed_texts(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    model = get_embedding_model()
    # bge models recommend a query/passage instruction prefix for best retrieval quality.
    vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return [v.tolist() for v in vectors]


def embed_query(query: str) -> List[float]:
    model = get_embedding_model()
    # bge-small recommended query instruction prefix
    prefixed = f"Represent this sentence for searching relevant passages: {query}"
    vector = model.encode([prefixed], normalize_embeddings=True, show_progress_bar=False)[0]
    return vector.tolist()
