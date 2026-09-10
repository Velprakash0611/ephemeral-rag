from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://raguser:ragpassword@db:5432/ragdb"

    # Auth
    SECRET_KEY: str = "change_me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"

    # Admin (optional; if not provided, the first registered user becomes admin)
    ADMIN_EMAIL: str = ""
    ADMIN_USERNAME: str = ""
    ADMIN_PASSWORD: str = ""

    # Email Service for 100% Free OTP (Resend free tier or SMTP)
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "Ephemeral RAG <onboarding@resend.dev>"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    @property
    def resend_key(self) -> str:
        return (self.RESEND_API_KEY or "").strip().strip('"').strip("'")

    # Guest user limits
    GUEST_MAX_QUERIES: int = 4

    # LLM (Native Groq Cloud Inference)
    GROQ_API_KEY: str = ""
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "openai/gpt-oss-20b"

    @property
    def groq_key(self) -> str:
        raw = (self.GROQ_API_KEY.strip() if self.GROQ_API_KEY else "") or (self.LLM_API_KEY.strip() if self.LLM_API_KEY else "")
        return raw.strip('"').strip("'")

    # Embeddings & Reranker (top-tier open source models, run locally at $0 cost)
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIM: int = 384
    RERANK_MODEL: str = "BAAI/bge-reranker-base"

    # Misc
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 25
    TOP_K_CHUNKS: int = 6
    ALLOWED_ORIGINS: str = "*"

    model_config = SettingsConfigDict(
        env_file=[
            str(Path(__file__).resolve().parent.parent / ".env"),
            str(Path(__file__).resolve().parent.parent.parent / ".env"),
            ".env",
        ],
        extra="ignore",
    )


settings = Settings()
