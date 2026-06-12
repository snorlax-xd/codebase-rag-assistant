import os
from functools import lru_cache
from pathlib import Path


def _csv_env(name: str, default: str) -> list[str]:
    return [
        item.strip()
        for item in os.getenv(name, default).split(",")
        if item.strip()
    ]


def _int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer") from exc


def _float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a number") from exc


class Settings:
    app_name = os.getenv("APP_NAME", "CodeMind AI Backend")
    repositories_path = Path(
        os.getenv("REPOSITORIES_PATH", "repositories")
    ).resolve()
    cors_origins = _csv_env(
        "CORS_ORIGINS",
        "http://localhost:3000,https://codebase-rag-assistant.vercel.app",
    )
    cors_origin_regex = os.getenv(
        "CORS_ORIGIN_REGEX",
        r"https://.*\.vercel\.app",
    )

    qdrant_host = os.getenv("QDRANT_HOST", "localhost")
    qdrant_port = _int_env("QDRANT_PORT", 6333)
    qdrant_collection = os.getenv("QDRANT_COLLECTION", "codebase_chunks")
    embedding_dim = _int_env("EMBEDDING_DIM", 3072)
    search_limit = _int_env("SEARCH_LIMIT", 8)  # raised from 5

    google_api_key = os.getenv("GOOGLE_API_KEY")
    embedding_model = os.getenv(
        "GEMINI_EMBEDDING_MODEL",
        "models/gemini-embedding-001",
    )
    generation_model = os.getenv("GEMINI_GENERATION_MODEL", "gemini-2.5-flash")
    gemini_base_url = os.getenv(
        "GEMINI_BASE_URL",
        "https://generativelanguage.googleapis.com/v1beta",
    )
    embedding_timeout_seconds = _int_env("EMBEDDING_TIMEOUT_SECONDS", 60)
    embedding_retry_attempts = _int_env("EMBEDDING_RETRY_ATTEMPTS", 5)
    embedding_rate_limit_seconds = _float_env("EMBEDDING_RATE_LIMIT_SECONDS", 0)
    max_embedding_chars = _int_env("MAX_EMBEDDING_CHARS", 8000)

    max_context_chars = _int_env("MAX_CONTEXT_CHARS", 20000)  # raised from 12000
    generation_max_retries = _int_env("GENERATION_MAX_RETRIES", 3)
    # Raised from 1024 — code answers were getting cut off mid-sentence
    generation_max_output_tokens = _int_env("GENERATION_MAX_OUTPUT_TOKENS", 4096)
    generation_temperature = _float_env("GENERATION_TEMPERATURE", 0.2)

    max_text_file_bytes = _int_env("MAX_TEXT_FILE_BYTES", 250_000)
    max_scan_files = _int_env("MAX_SCAN_FILES", 5000)
    ignore_directories = set(
        _csv_env(
            "IGNORE_DIRECTORIES",
            ".git,node_modules,__pycache__,venv,.venv,dist,build,.next,coverage",
        )
    )

    clone_timeout_seconds = _int_env("GIT_CLONE_TIMEOUT_SECONDS", 120)
    index_workers = _int_env("INDEX_WORKERS", 4)


@lru_cache
def get_settings() -> Settings:
    return Settings()