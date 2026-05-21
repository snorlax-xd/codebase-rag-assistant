import os
import requests

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def generate_embedding(text: str):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={GEMINI_API_KEY}"
    payload = {
        "content": {
            "parts": [{"text": text}]
        }
    }
    response = requests.post(url, json=payload)

    if not response.ok:
        raise Exception(f"Gemini embedding error {response.status_code}: {response.text}")

    return response.json()["embedding"]["values"]