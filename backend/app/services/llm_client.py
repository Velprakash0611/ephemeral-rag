"""
Thin wrapper around any OpenAI-compatible open-source LLM endpoint.

Default configured for Groq (free tier, fast inference of open-source
models like Llama 3.1). Swappable to Together/OpenRouter/Ollama/vLLM by
changing LLM_API_BASE / LLM_API_KEY / LLM_MODEL in .env -- no code changes.
"""
import time
import logging
from openai import OpenAI, RateLimitError, APIError, APITimeoutError, AuthenticationError
from app.config import settings

logger = logging.getLogger(__name__)


def get_llm_client() -> OpenAI:
    api_key = settings.LLM_API_KEY.strip() if settings.LLM_API_KEY else "not-needed"
    return OpenAI(
        base_url=settings.LLM_API_BASE,
        api_key=api_key,
        timeout=30.0,
    )

MAX_RETRIES = 3
BASE_BACKOFF_SECONDS = 1.5  # 1.5s, 3s, 6s -- absorbs brief bursts from concurrent users
FALLBACK_MESSAGE = (
    "The AI service is experiencing high demand right now. "
    "Please try again in a moment."
)

SYSTEM_PROMPT = (
    "You are a helpful assistant that answers questions strictly using the "
    "provided context excerpts from the user's uploaded document(s). "
    "Rules:\n"
    "1. Only use information present in the context below. Do not use outside knowledge.\n"
    "2. If the context does not contain the answer, say so clearly instead of guessing.\n"
    "3. When you use a fact from a context excerpt, reference it using its [Source N] tag.\n"
    "4. Be concise and directly answer the question first, then elaborate if needed."
)


def build_prompt(question: str, context_chunks: list[dict]) -> list[dict]:
    formatted_chunks = []
    for i, c in enumerate(context_chunks):
        meta_parts = []
        if c.get("page_number") is not None:
            meta_parts.append(f"page {c['page_number']}")
        if c.get("section"):
            meta_parts.append(f"section: {c['section']}")
        meta_str = f" ({', '.join(meta_parts)})" if meta_parts else ""
        formatted_chunks.append(f"[Source {i+1}]{meta_str}\n{c['content']}")

    context_block = "\n\n".join(formatted_chunks)
    user_content = f"Context:\n{context_block}\n\nQuestion: {question}"
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


AVAILABLE_MODELS = [
    {
        "id": "llama-3.1-8b-instant",
        "name": "Llama 3.1 8B Instant",
        "description": "Ultra-fast & lightweight (Default)",
    },
    {
        "id": "llama-3.3-70b-versatile",
        "name": "Llama 3.3 70B Versatile",
        "description": "High-accuracy flagship open model",
    },
    {
        "id": "mixtral-8x7b-32768",
        "name": "Mixtral 8x7B",
        "description": "MoE model with 32k context window",
    },
    {
        "id": "gemma2-9b-it",
        "name": "Gemma 2 9B",
        "description": "Google lightweight instruction-tuned model",
    },
    {
        "id": "deepseek-r1-distill-llama-70b",
        "name": "DeepSeek R1 Distill 70B",
        "description": "Advanced reasoning & chain-of-thought",
    },
]


def generate_answer(question: str, context_chunks: list[dict], model_name: str | None = None) -> tuple[str, dict]:
    """
    Calls the OpenAI-compatible LLM endpoint (Groq / Ollama / etc.)
    with retry on rate limits and returns (answer, token_usage_dict).
    """
    client = get_llm_client()
    messages = build_prompt(question, context_chunks)
    target_model = (model_name.strip() if model_name else None) or settings.LLM_MODEL

    default_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=target_model,
                messages=messages,
                temperature=0.2,
                max_tokens=800,
            )
            content = response.choices[0].message.content.strip()

            usage = default_usage.copy()
            if hasattr(response, "usage") and response.usage:
                usage["prompt_tokens"] = getattr(response.usage, "prompt_tokens", 0) or 0
                usage["completion_tokens"] = getattr(response.usage, "completion_tokens", 0) or 0
                usage["total_tokens"] = getattr(response.usage, "total_tokens", 0) or 0

            return content, usage

        except AuthenticationError:
            logger.error("LLM API authentication failed. Check LLM_API_KEY in .env.")
            err_msg = (
                "⚠️ LLM Authentication Error: Invalid or missing API key. "
                "Please configure a valid free LLM_API_KEY in your .env "
                "(get a free key at https://console.groq.com)."
            )
            return err_msg, default_usage

        except RateLimitError:
            wait = BASE_BACKOFF_SECONDS * (2 ** attempt)
            logger.warning(f"LLM rate-limited (attempt {attempt + 1}/{MAX_RETRIES}); retrying in {wait}s")
            if attempt < MAX_RETRIES - 1:
                time.sleep(wait)
            else:
                return FALLBACK_MESSAGE, default_usage

        except (APITimeoutError, APIError) as e:
            logger.warning(f"LLM call failed (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(BASE_BACKOFF_SECONDS)
            else:
                return FALLBACK_MESSAGE, default_usage

    return FALLBACK_MESSAGE, default_usage
