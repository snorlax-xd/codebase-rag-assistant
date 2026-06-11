import time
import requests
from fastapi import HTTPException
from app.config import get_settings


settings = get_settings()


def generate_embedding(text: str):

    if not settings.google_api_key:
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_API_KEY is not configured on the backend."
        )

    # Clean and limit input size
    text = text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Cannot generate embedding for empty text."
        )

    # Gemini embedding endpoint
    url = (
        f"{settings.gemini_base_url}/"
        f"{settings.embedding_model}:embedContent"
        f"?key={settings.google_api_key}"
    )

    payload = {
        "model": settings.embedding_model,
        "content": {
            "parts": [
                {
                    # Stay well within token limits
                    "text": text[:settings.max_embedding_chars]
                }
            ]
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    if settings.embedding_rate_limit_seconds > 0:
        time.sleep(settings.embedding_rate_limit_seconds)

    for attempt in range(settings.embedding_retry_attempts):

        try:

            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=settings.embedding_timeout_seconds
            )

            # SUCCESS
            if response.status_code == 200:

                data = response.json()

                if "embedding" not in data:
                    raise Exception(
                        f"Embedding missing in response: {data}"
                    )

                if "values" not in data["embedding"]:
                    raise Exception(
                        f"Embedding values missing: {data}"
                    )

                return data["embedding"]["values"]

            # RETRYABLE ERRORS
            if response.status_code in [
                429,
                500,
                502,
                503,
                504
            ]:

                wait_time = min((attempt + 1) * 5, 30)

                print(
                    f"Gemini API temporary error "
                    f"{response.status_code}. "
                    f"Retrying in {wait_time}s "
                    f"({attempt + 1}/{settings.embedding_retry_attempts})"
                )

                print(response.text)

                time.sleep(wait_time)

                continue

            # PERMANENT ERRORS
            raise Exception(
                f"Gemini API Error "
                f"{response.status_code}: "
                f"{response.text}"
            )

        except requests.exceptions.RequestException as error:

            wait_time = min((attempt + 1) * 3, 15)

            print(
                f"Network error: {error}. "
                f"Retrying in {wait_time}s "
                f"({attempt + 1}/{settings.embedding_retry_attempts})"
            )

            time.sleep(wait_time)

    raise Exception(
        f"Gemini embedding failed after {settings.embedding_retry_attempts} retries"
    )
