import os
import time
import requests

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def generate_embedding(text: str):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
    payload = {
        "model": "models/gemini-embedding-001",
        "content": {
            "parts": [{"text": text}]
        }
    }

    # Proactive delay — stay under 100 req/min free tier limit
    time.sleep(0.7)

    for attempt in range(7):
        response = requests.post(url, json=payload)

        if response.status_code == 200:
            return response.json()["embedding"]["values"]

        if response.status_code in (429, 503):
            wait = 30 * (attempt + 1)
            print(f"API error {response.status_code}, waiting {wait}s before retry {attempt + 1}/7...")
            time.sleep(wait)
            continue

        raise Exception(f"Gemini embedding error {response.status_code}: {response.text}")

    raise Exception("Gemini embedding failed after 7 retries")