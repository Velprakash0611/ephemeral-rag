"""
Structure-aware chunking.

Naive RAG chunks a document by raw character count, which frequently cuts a
table in half or splits a sentence across two unrelated chunks. Here we
instead:

  1. Never split a table element — it stays whole and becomes its own chunk
     (tables are retrieved/cited as a unit).
  2. Group consecutive "text" elements under the same heading/section, and
     only then apply a token-budget split with overlap, so section boundaries
     are respected before size limits are.
  3. Keep page_number / section / element_type metadata on every chunk for
     citation and for the retrieval-debug panel.
"""
from typing import List, Dict, Any

CHUNK_SIZE_CHARS = 1200      # ~ roughly 250-300 tokens
CHUNK_OVERLAP_CHARS = 200


def _split_text(text: str, size: int, overlap: int) -> List[str]:
    if len(text) <= size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        # try to break on a sentence/space boundary near the end
        if end < len(text):
            boundary = text.rfind(". ", start, end)
            if boundary != -1 and boundary > start + size // 2:
                end = boundary + 1
        chunks.append(text[start:end].strip())
        if end == len(text):
            break
        start = max(end - overlap, start + 1)
    return [c for c in chunks if c]


def chunk_elements(elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    chunks: List[Dict[str, Any]] = []
    buffer_text = []
    buffer_meta = {"page_number": None, "section": None}

    def flush_buffer():
        if not buffer_text:
            return
        joined = "\n".join(buffer_text).strip()
        if not joined:
            return
        for piece in _split_text(joined, CHUNK_SIZE_CHARS, CHUNK_OVERLAP_CHARS):
            chunks.append({
                "content": piece,
                "page_number": buffer_meta["page_number"],
                "section": buffer_meta["section"],
                "element_type": "text",
            })
        buffer_text.clear()

    for el in elements:
        if el["type"] == "table":
            # Tables are never merged with surrounding text or split.
            flush_buffer()
            chunks.append({
                "content": el["text"],
                "page_number": el.get("page_number"),
                "section": el.get("section"),
                "element_type": "table",
            })
        elif el["type"] == "heading":
            # New section boundary -> flush what we have, start fresh
            flush_buffer()
            buffer_meta["section"] = el["text"]
            buffer_meta["page_number"] = el.get("page_number")
            # Include the heading itself as leading context for the next chunk
            buffer_text.append(f"# {el['text']}")
        else:  # "text"
            if buffer_meta["page_number"] is None:
                buffer_meta["page_number"] = el.get("page_number")
            if buffer_meta["section"] is None:
                buffer_meta["section"] = el.get("section")
            buffer_text.append(el["text"])

    flush_buffer()

    for idx, c in enumerate(chunks):
        c["chunk_index"] = idx

    return chunks
