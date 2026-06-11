import os
import time
import requests


GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

# Correct embedding model
EMBEDDING_MODEL = "models/gemini-embedding-001"

# Correct API endpoint
BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def generate_embedding(text: str):

    if not GEMINI_API_KEY:
        raise Exception(
            "GOOGLE_API_KEY environment variable not found"
        )

    # Clean and limit input size
    text = text.strip()

    if not text:
        raise Exception("Cannot generate embedding for empty text")

    # Gemini embedding endpoint
    url = (
        f"{BASE_URL}/"
        f"{EMBEDDING_MODEL}:embedContent"
        f"?key={GEMINI_API_KEY}"
    )

    payload = {
        "model": EMBEDDING_MODEL,
        "content": {
            "parts": [
                {
                    # Stay well within token limits
                    "text": text[:8000]
                }
            ]
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    # Free-tier rate limiting safety
    time.sleep(0.7)

    for attempt in range(7):

        try:

            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=60
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

                wait_time = (attempt + 1) * 15

                print(
                    f"Gemini API temporary error "
                    f"{response.status_code}. "
                    f"Retrying in {wait_time}s "
                    f"({attempt + 1}/7)"
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

            wait_time = (attempt + 1) * 10

            print(
                f"Network error: {error}. "
                f"Retrying in {wait_time}s "
                f"({attempt + 1}/7)"
            )

            time.sleep(wait_time)

    raise Exception(
        "Gemini embedding failed after 7 retries"
    )