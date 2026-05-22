import os
import time
import requests

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

EMBEDDING_MODEL = "models/embedding-001"


def generate_embedding(text: str):

    if not GEMINI_API_KEY:
        raise Exception("GOOGLE_API_KEY environment variable not found")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/"
        f"{EMBEDDING_MODEL}:embedContent?key={GEMINI_API_KEY}"
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

    # Stay within free-tier limits
    time.sleep(0.7)

    for attempt in range(7):

        try:
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=60
            )

            # Success
            if response.status_code == 200:

                data = response.json()

                if "embedding" not in data:
                    raise Exception(
                        f"Embedding missing in response: {data}"
                    )

                return data["embedding"]["values"]

            # Retryable errors
            if response.status_code in [429, 500, 502, 503, 504]:

                wait_time = (attempt + 1) * 15

                print(
                    f"Gemini API error {response.status_code}. "
                    f"Retrying in {wait_time}s "
                    f"({attempt + 1}/7)"
                )

                time.sleep(wait_time)
                continue

            # Permanent failure
            raise Exception(
                f"Gemini API Error {response.status_code}: "
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

    raise Exception("Gemini embedding failed after 7 retries")