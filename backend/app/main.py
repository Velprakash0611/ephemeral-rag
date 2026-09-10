import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, SessionLocal
from app import models
from app.config import settings
from app.auth import hash_password
from app.routers import auth as auth_router
from app.routers import documents as documents_router
from app.routers import chat as chat_router
from app.routers import admin as admin_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the pgvector extension exists (Neon supports it; must be enabled once).
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector;")
            conn.commit()
    except Exception as e:
        logger.warning(f"Could not auto-create vector extension (may already exist or requires console enable): {e}")

    Base.metadata.create_all(bind=engine)

    # Auto-provision the default admin/demo user from .env only if explicitly specified
    if settings.ADMIN_EMAIL and settings.ADMIN_EMAIL.strip():
        db = SessionLocal()
        try:
            existing = db.query(models.User).filter(models.User.email == settings.ADMIN_EMAIL.strip()).first()
            if not existing:
                admin = models.User(
                    username=settings.ADMIN_USERNAME.strip() or "admin",
                    email=settings.ADMIN_EMAIL.strip(),
                    hashed_password=hash_password(settings.ADMIN_PASSWORD or "admin123"),
                    role="admin",
                    is_admin=True,
                    is_verified=True,
                )
                db.add(admin)
                db.commit()
        finally:
            db.close()

    yield


app = FastAPI(title="RAG Document Q&A API", version="1.0.0", lifespan=lifespan)

# Parse allowed origins from settings (comma-separated or wildcard)
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
is_wildcard = origins == ["*"] or not origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if is_wildcard else origins,
    # Browsers disallow allow_credentials=True when allow_origins is wildcard "*"
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(documents_router.router)
app.include_router(chat_router.router)
app.include_router(admin_router.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "RAG Document Q&A API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
