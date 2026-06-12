import time
import requests

from app.config import get_settings

settings = get_settings()

EMBEDDING_MODEL = "models/gemini-embedding-001"
BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def generate_embedding(text: str):

    api_key = settings.google_api_key  # consistent with rest of backend

    if not api_key:
        raise Exception(
            "GOOGLE_API_KEY is not configured on the backend."
        )

    text = text.strip()

    if not text:
        raise Exception("Cannot generate embedding for empty text")

    url = (
        f"{BASE_URL}/"
        f"{EMBEDDING_MODEL}:embedContent"
        f"?key={api_key}"
    )

    payload = {
        "model": EMBEDDING_MODEL,
        "content": {
            "parts": [
                {
                    "text": text[:8000]
                }
            ]
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    time.sleep(0.7)

    for attempt in range(7):

        try:

            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=60
            )

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

            if response.status_code in [429, 500, 502, 503, 504]:

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