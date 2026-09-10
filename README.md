# Contextual — Hybrid RAG Document Q&A

A full end-to-end **Retrieval-Augmented Generation** pipeline: upload a PDF/DOCX,
ask questions about it, and see exactly how the answer was retrieved and grounded.

Built to demonstrate understanding of the RAG pipeline itself — not as a SaaS
product — so the emphasis is on making retrieval **visible and inspectable**,
not on account management.

## Pipeline

```
Upload (PDF/DOCX)
   │
   ▼
Structure-aware Parsing        headings, tables, page numbers (PyMuPDF / pdfplumber / python-docx)
   │
   ▼
Structure-aware Chunking       never splits a table; chunks respect section boundaries
   │
   ▼
Embedding                      local BAAI/bge-small-en-v1.5 (384-dim, $0 API cost)
   │
   ▼
Vector Store                   PostgreSQL + pgvector (Neon, $0 free tier)
   │
   ▼
Hybrid Retrieval    ┌── BM25 (keyword/sparse)         rank_bm25, built per-query
                     └── Vector search (dense)         pgvector cosine similarity
   │
   ▼
Reciprocal Rank Fusion (RRF)   combines dense & sparse rankings via RRF (k=60)
   │
   ▼
Cross-Encoder Rerank           scores query-chunk relevance via BAAI/bge-reranker-base
   │
   ▼
LLM Generation                 fast open-source model via Groq ($0 free tier)
   │
   ▼
Grounded Answer + Citations    every answer cites the exact page/section/chunk it used
```

Every question's full retrieval trace (BM25 score, vector similarity, RRF score,
rerank score, per chunk) is stored and shown in the UI's **retrieval-debug panel** —
providing complete observability into how each response was retrieved and grounded.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | FastAPI (Python) | async, typed, minimal, modern lifespan management |
| Database | PostgreSQL + pgvector (Neon) | 100% free serverless DB for relational data *and* vectors |
| Embeddings | `sentence-transformers` (`BAAI/bge-small-en-v1.5`) | top-tier open source model, runs locally at $0 cost |
| Sparse retrieval | `rank_bm25` | pure-Python, zero external resource cost |
| Hybrid Fusion | Reciprocal Rank Fusion (RRF) | industry standard fusion for multi-modal ranking |
| Reranker | `sentence-transformers` CrossEncoder (`BAAI/bge-reranker-base`) | state-of-the-art precision pass over fused candidates |
| LLM | Groq (`llama-3.1-8b-instant`) | 100% free tier, ultra-fast open-source inference |
| Auth | JWT bearer tokens | clean, robust cross-origin auth for split frontend/backend |
| Frontend | React + Vite + Tailwind v4 | static SPA, deploys free to Vercel or Netlify |

Entirely free to build, test, and host. No Docker required anywhere — runs natively on Python and Node.

## Project structure

```
rag-app/
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI app, CORS, startup (creates tables + admin user)
│   │   ├── config.py          reads .env
│   │   ├── database.py        SQLAlchemy engine/session
│   │   ├── models.py          User, Document, Chunk, ChatSession, ChatMessage, ActivityLog
│   │   ├── schemas.py         Pydantic request/response models
│   │   ├── auth.py            password hashing + JWT
│   │   ├── deps.py            get_current_user (bearer token)
│   │   ├── routers/
│   │   │   ├── auth.py        register / login / me
│   │   │   ├── documents.py   upload, list, delete documents (background ingest)
│   │   │   └── chat.py        sessions, message history, /ask (runs the pipeline)
│   │   └── services/
│   │       ├── file_parser.py     structure-aware PDF/DOCX parsing
│   │       ├── chunker.py         heading/table-aware chunking
│   │       ├── embeddings.py      local embedding model
│   │       ├── bm25_index.py      sparse retrieval
│   │       ├── vector_store.py    pgvector dense retrieval + chunk persistence
│   │       ├── reranker.py        cross-encoder rerank
│   │       ├── llm_client.py      Groq / any OpenAI-compatible LLM call
│   │       └── rag_pipeline.py    orchestrates the full pipeline end-to-end
│   └── requirements.txt
├── frontend/                  React + Vite + Tailwind (Vercel/Netlify)
│   └── src/
│       ├── pages/              Login, Register, Chat
│       └── components/         Sidebar, UploadWidget, MessageBubble, RetrievalDebugPanel
├── eval/
│   ├── qa_dataset.json         sample Q&A set (edit this with real questions)
│   ├── rag_evaluation.ipynb    hit-rate, MRR, score breakdown, groundedness check
│   └── requirements.txt
├── render.yaml                 backend deploy config (no Docker)
└── .env.example
```

## Free-tier deployment walkthrough

### 1. Database — Neon
1. Create a free project at [neon.tech](https://neon.tech).
2. In the SQL editor, run: `CREATE EXTENSION IF NOT EXISTS vector;`
   (the backend also attempts this automatically on startup, but Neon may
   require it be enabled once via their console on some plans.)
3. Copy the connection string (`postgresql://...`).

### 2. LLM — Groq
1. Create a free account at [console.groq.com](https://console.groq.com).
2. Generate an API key.

### 3. Backend — Render
1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, point it at your repo (it will read `render.yaml`).
3. Fill in the environment variables Render prompts for:
   - `DATABASE_URL` → your Neon connection string
   - `LLM_API_KEY` → your Groq key
   - `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` → creates your first login on startup
4. Deploy. Note the resulting URL, e.g. `https://rag-backend.onrender.com`.

> Free tier note: the service sleeps after 15 min of inactivity; the first
> request after sleeping takes ~30–50s to wake up and reload the embedding/
> reranker models into memory.

### 4. Frontend — Vercel or Netlify
1. In `frontend/.env.example`, copy to `.env` and set:
   ```
   VITE_API_BASE_URL=https://rag-backend.onrender.com
   ```
2. **Vercel**: import the repo, set root directory to `frontend`, it auto-detects Vite.
3. **Netlify**: import the repo, root directory `frontend` — `netlify.toml` already sets the build command and publish directory.
4. Add the same `VITE_API_BASE_URL` env var in the platform's dashboard.

### 5. Try it
Register an account, upload a PDF or DOCX, ask a question, then click
"inspect N retrieved chunks" on any answer to see the BM25/vector/rerank
scores that produced it.

## Local development (optional)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # edit DATABASE_URL to point at Neon (or your own Postgres+pgvector)
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

## Running the evaluation notebook

```bash
cd eval
pip install -r requirements.txt
# Edit qa_dataset.json with real questions about a document you've uploaded
jupyter notebook rag_evaluation.ipynb
```

Computes retrieval **Hit-Rate@k**, **MRR**, a per-question BM25/vector/rerank
score breakdown chart, and an answer **groundedness** score (embedding
similarity between generated answer and its cited context).

## Known scope tradeoffs (deliberate, not oversights)

- **No OCR / vision-model image captioning** — scanned PDFs and embedded
  charts/images aren't read. Would add PaddleOCR/Tesseract + a VLM captioning
  step in `file_parser.py`.
- **BM25 index is rebuilt per-query**, not persisted — fine at demo scale
  (a handful of documents per user); a production system would maintain an
  incremental index (e.g. via OpenSearch/Elasticsearch).
- **No admin dashboard** — auth exists only to scope chat history per user,
  intentionally kept minimal per the project's RAG-focused goal.
