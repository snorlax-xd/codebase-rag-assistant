import os
import requests

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

MAX_CONTEXT_CHARS = 6000

def generate_response(query: str, context_chunks: list[str]) -> str:
    combined = ""
    for chunk in context_chunks:
        if len(combined) + len(chunk) > MAX_CONTEXT_CHARS:
            break
        combined += chunk + "\n\n"

    prompt = f"""You are an expert code assistant. Answer the user's question using ONLY the provided code context. Be precise and technical.

CODE CONTEXT:
{combined.strip()}

QUESTION:
{query}

ANSWER:"""

    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json()["candidates"][0]["content"]["parts"][0]["text"]