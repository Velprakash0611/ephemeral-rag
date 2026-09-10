"""
Native Groq Cloud open-source LLM client (100% free tier).
Provides fast inference across open-source models:
Llama 3.1 8B, Llama 3.3 70B, Mixtral 8x7B, Gemma 2 9B, DeepSeek R1 Distill.
"""
import time
import logging
from groq import Groq, RateLimitError, APIError, APITimeoutError, AuthenticationError
from app.config import settings

logger = logging.getLogger(__name__)


def get_llm_client() -> Groq:
    api_key = settings.groq_key or "not-needed"
    return Groq(
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


import re

AVAILABLE_MODELS = [
    {
        "id": "openai/gpt-oss-20b",
        "name": "GPT-OSS 20B",
        "description": "Fast & highly accurate open weights model (Default)",
    },
    {
        "id": "groq/compound-mini",
        "name": "Groq Compound Mini",
        "description": "Ultra-fast direct inference",
    },
    {
        "id": "openai/gpt-oss-120b",
        "name": "GPT-OSS 120B",
        "description": "Flagship 120B open reasoning model",
    },
    {
        "id": "qwen/qwen3.6-27b",
        "name": "Qwen 3.6 27B",
        "description": "Multilingual open reasoning model",
    },
    {
        "id": "llama-3.1-8b-instant",
        "name": "Llama 3.1 8B",
        "description": "Meta Llama (if enabled on account)",
    },
]


def generate_answer(question: str, context_chunks: list[dict], model_name: str | None = None) -> tuple[str, dict]:
    """
    Calls the native Groq LLM endpoint with retry on rate limits and returns (answer, token_usage_dict).
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
            # Strip reasoning model <think>...</think> tags if present
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()

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
