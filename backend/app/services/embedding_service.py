import os
import requests

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def generate_embedding(text: str):
    url = f"https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key={GEMINI_API_KEY}"
    payload = {
        "model": "models/text-embedding-004",
        "content": {
            "parts": [{"text": text}]
        }
    }
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json()["embedding"]["values"]