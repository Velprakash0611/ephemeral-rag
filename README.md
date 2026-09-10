# Ephemeral RAG — Intelligent Document Q&A

A modern, production-grade **Retrieval-Augmented Generation (RAG)** application engineered for high-precision document intelligence with **zero recurring database costs**. Upload PDF or Word documents, ask complex questions, and inspect the exact multi-stage retrieval pipeline that grounded each response.

Designed with an **ephemeral privacy architecture**: document embeddings are purged on session close to permanently fit within free-tier serverless limits, while your conversation histories and token metrics remain preserved.

---

## Retrieval Pipeline Architecture

```
Upload (PDF/DOCX)
   │
   ▼
Structure-aware Parsing        Extracts headings, tables, and page metadata (PyMuPDF / pdfplumber / python-docx)
   │
   ▼
Boundary-aware Chunking        Preserves markdown tables and respects section headings (never splits tables)
   │
   ▼
Dense Embedding (Local)        Generates 384-dim vectors via BAAI/bge-small-en-v1.5 ($0 API cost, in-memory CPU)
   │
   ▼
Ephemeral Vector Storage       Persists chunks to PostgreSQL + pgvector (Neon Serverless)
   │
   ▼
Hybrid Retrieval Engine  ┌── BM25 (sparse keyword match)       Built dynamically via rank_bm25
                         └── Vector Search (dense semantic)    pgvector cosine similarity (<=>)
   │
   ▼
Reciprocal Rank Fusion (RRF)   Combines sparse and dense candidate ranks using standard RRF (k=60)
   │
   ▼
Cross-Encoder Reranker         High-precision relevance scoring via BAAI/bge-reranker-base ($0 local model)
   │
   ▼
LLM Inference (Groq)           Sub-second streaming generation via Groq open-source models (GPT-OSS 20B, Compound Mini, Qwen)
   │
   ▼
Grounded Answer + Citations    Every answer highlights exact source chunks, pages, and token analytics
```

---

## Key Features

- **Ephemeral Storage Architecture (100% Free Guarantee)**: Uploaded files and vector embeddings are automatically purged from PostgreSQL upon tab close (`sendBeacon`), logout, or manual purge to preserve free database storage (< 0.5 GB).
- **Persistent Chat History**: User questions, answers, source citations, and original document name badges remain permanently saved in PostgreSQL for registered users.
- **Hybrid Retrieval & RRF ($k=60$)**: Fuses BM25 sparse keyword ranking with pgvector dense cosine similarity, overcoming vocabulary mismatch and semantic drift.
- **Cross-Encoder Reranking**: Second-stage reranking via `BAAI/bge-reranker-base` locally on CPU with zero external API fees.
- **Complete Retrieval Observability**: Slide-over debug drawer displaying fused RRF scores, BM25 scores, vector similarity, and reranker rankings for every retrieved chunk.
- **Multi-Model Selector**: Switch between Groq models dynamically on the fly (`openai/gpt-oss-20b`, `groq/compound-mini`, `openai/gpt-oss-120b`, `qwen/qwen3.6-27b`).
- **Authentication & Onboarding**:
  - **Email OTP Verification**: Two-step account creation with 6-digit verification codes (supports free Resend API, standard Gmail SMTP, and local terminal fallback).
  - **Instant Guest Mode**: Unregistered visitors can test the app immediately (up to 4 queries) with automatic guest cleanup upon exit.
  - **Role-Based Admin Console**: Admin dashboard displaying live metrics across accounts, documents, and system-wide LLM token consumption.
  - **User Token Dashboard**: Personal KPI dashboard tracking individual prompt, completion, and total tokens used, with self-service account deletion.
- **Modern Design System**:
  - Clean, professional aesthetic inspired by Linear and Supabase.
  - **Zero Emojis**: Every indicator, button, and badge uses crisp inline SVG icons.
  - **Dark & Light Mode Switcher**: Seamless theme toggle with Sun/Moon SVGs, `localStorage` persistence, and OS preference detection.

---

## Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend** | FastAPI (Python 3.11) | High-performance asynchronous REST API |
| **Database** | PostgreSQL + pgvector (Neon) | Free serverless database for relational data and vector embeddings |
| **Sparse Retrieval** | `rank_bm25` | In-memory BM25 Okapi keyword search |
| **Embeddings** | `BAAI/bge-small-en-v1.5` | Top-tier open-source embedding model running locally ($0 cost) |
| **Reranker** | `BAAI/bge-reranker-base` | Cross-encoder precision reranker running locally ($0 cost) |
| **LLM Inference** | Groq Cloud SDK | Ultra-fast inference with open-source models |
| **Email Service** | Resend API / Gmail SMTP | 6-digit OTP delivery for registration |
| **Frontend** | React 18 + Vite + Tailwind CSS v4 | Responsive single-page app with light/dark themes |
| **Auth** | JWT Bearer Tokens | Secure stateless authentication |

---

## Repository Structure

```
ephemeral-rag/
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI entrypoint, CORS configuration, lifespan manager
│   │   ├── config.py          Pydantic settings, environment variable loader
│   │   ├── database.py        SQLAlchemy connection pool and session generator
│   │   ├── models.py          Database schemas (User, Document, Chunk, ChatSession, ChatMessage)
│   │   ├── schemas.py         Pydantic validation schemas
│   │   ├── auth.py            JWT token creation and password hashing
│   │   ├── deps.py            Authentication dependency injection
│   │   ├── routers/
│   │   │   ├── auth.py        Registration, OTP verification, login, guest mode, user profile
│   │   │   ├── documents.py   File upload, background ingestion, listing, and session purge
│   │   │   ├── chat.py        Session management, message history, pipeline query endpoint
│   │   │   └── admin.py       User management and aggregate token consumption analytics
│   │   └── services/
│   │       ├── file_parser.py Structure-aware parsing for PDF and DOCX files
│   │       ├── chunker.py     Heading and table-aware document chunking
│   │       ├── embeddings.py  Local in-memory SentenceTransformer embeddings
│   │       ├── bm25_index.py  BM25 sparse candidate retrieval
│   │       ├── vector_store.py pgvector cosine similarity candidate retrieval
│   │       ├── reranker.py    Local CrossEncoder reranking
│   │       ├── llm_client.py  Native Groq Cloud API client
│   │       ├── email_service.py 3-tier OTP email dispatcher (Resend -> SMTP -> Console)
│   │       └── rag_pipeline.py End-to-end RRF pipeline orchestrator
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/        Sidebar, UploadWidget, MessageBubble, DebugPanel, AdminDashboard, UserDashboard, Icons
│   │   ├── pages/             Login, Register, Chat
│   │   ├── lib/               API client (api.js), Theme provider & toggle (theme.jsx)
│   │   ├── App.jsx            Application routes
│   │   └── index.css          Tailwind v4 theme variables and styles
│   ├── package.json
│   └── vite.config.js
├── eval/
│   ├── qa_dataset.json        Benchmark Q&A evaluation dataset
│   ├── rag_evaluation.ipynb   Hit-Rate@k, MRR, score distribution, and groundedness metrics
│   └── requirements.txt
└── .env.example
```

---

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Free [Neon PostgreSQL](https://neon.tech) connection string with pgvector
- Free [Groq Cloud](https://console.groq.com) API key

### 1. Clone the Repository
```bash
git clone https://github.com/Velprakash0611/ephemeral-rag.git
cd ephemeral-rag
```

### 2. Configure Backend Environment
Create a `.env` file inside the `backend` directory (refer to `.env.example`):
```env
DATABASE_URL=postgresql://[user]:[password]@[neon-host]/neondb?sslmode=require
SECRET_KEY=generate_a_long_random_secret_string
GROQ_API_KEY=gsk_your_groq_api_key_here
LLM_MODEL=openai/gpt-oss-20b
ALLOWED_ORIGINS=*

# Optional Email Delivery (If omitted, OTP codes print to terminal):
# RESEND_API_KEY=re_your_key_here
# EMAIL_FROM=Ephemeral RAG <onboarding@resend.dev>
```

### 3. Run Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate      # On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend API will start at: `http://localhost:8000` (Interactive docs at `http://localhost:8000/docs`).

### 4. Run Frontend
Open a new terminal:
```powershell
cd frontend
npm install
npm run dev
```
Frontend application will start at: `http://localhost:5173`.

---

## Production Deployment (100% Free Tier)

### Step 1: Deploy Backend on Render (Web Service)
1. Go to [Render Dashboard](https://dashboard.render.com) and click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
4. Add the following **Environment Variables** in Render:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string (with `?sslmode=require`).
   - `SECRET_KEY`: A secure random JWT signing secret.
   - `GROQ_API_KEY`: Your Groq Cloud API key.
   - `LLM_MODEL`: `openai/gpt-oss-20b`
   - `ALLOWED_ORIGINS`: Your Netlify frontend domain (or `*` initially).
   - *(Optional email settings)*: `RESEND_API_KEY` or `SMTP_*` variables.
5. Click **Deploy Web Service** and copy your backend URL (e.g., `https://ephemeral-rag-api.onrender.com`).

### Step 2: Deploy Frontend on Netlify
1. Go to [Netlify Dashboard](https://app.netlify.com) and click **Add new site** -> **Import an existing project**.
2. Select your GitHub repository.
3. Configure the build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Add the following **Environment Variable** in Netlify:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: Your Render backend URL (e.g. `https://ephemeral-rag-api.onrender.com`)
5. Click **Deploy Site**.

### Step 3: Complete CORS Handshake
1. Copy your live Netlify URL (e.g., `https://ephemeral-rag.netlify.app`).
2. Return to Render -> Web Service -> **Environment**.
3. Update `ALLOWED_ORIGINS` to `https://ephemeral-rag.netlify.app`.

---

## Evaluation Benchmark

The repository includes an offline evaluation suite in [`eval/`](eval/) to measure retrieval performance:

```bash
cd eval
pip install -r requirements.txt
jupyter notebook rag_evaluation.ipynb
```

Metrics evaluated:
- **Hit-Rate@k**: Frequency with which the gold standard chunk appears in the top-$k$ retrieved candidates.
- **Mean Reciprocal Rank (MRR)**: Average reciprocal rank of the first relevant passage.
- **Cross-Encoder Score Calibration**: Distribution comparison between sparse BM25, dense cosine, fused RRF, and cross-encoder reranked scores.
- **Groundedness Score**: Cosine similarity between generated model response and the cited context passages.

---

## License

MIT License. Open source and free to customize.
