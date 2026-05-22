import os
import requests


# Use SAME env variable everywhere
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

MODEL_NAME = "gemini-1.5-flash"

MAX_CONTEXT_CHARS = 6000


def generate_response(
    query: str,
    context_chunks: list[str]
) -> str:

    # Validate API key
    if not GEMINI_API_KEY:
        raise Exception(
            "GOOGLE_API_KEY environment variable missing"
        )

    # Build combined context safely
    combined = ""

    for chunk in context_chunks:

        if not chunk:
            continue

        if len(combined) + len(chunk) > MAX_CONTEXT_CHARS:
            break

        combined += chunk + "\n\n"

    # Prevent empty context failures
    if not combined.strip():
        combined = "No relevant code context found."

    prompt = f"""
You are an expert code assistant.

Answer the user's question using ONLY the provided code context.

Be:
- precise
- technical
- concise
- code-aware

If the answer is not present in the context,
say that clearly.

CODE CONTEXT:
{combined.strip()}

QUESTION:
{query}

ANSWER:
"""

    # Correct Gemini endpoint
    url = (
        "https://generativelanguage.googleapis.com/v1beta/"
        f"models/{MODEL_NAME}:generateContent"
        f"?key={GEMINI_API_KEY}"
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1024
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    response = requests.post(
        url,
        json=payload,
        headers=headers,
        timeout=120
    )

    # Better debugging
    if response.status_code != 200:

        print("========== GEMINI GENERATION ERROR ==========")
        print(response.text)
        print("=============================================")

        raise Exception(
            f"Gemini generation failed: "
            f"{response.status_code} "
            f"{response.text}"
        )

    data = response.json()

    # Safe parsing
    candidates = data.get("candidates")

    if not candidates:
        raise Exception(
            f"No candidates returned: {data}"
        )

    content = (
        candidates[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text")
    )

    if not content:
        raise Exception(
            f"Empty Gemini response: {data}"
        )

    return content.strip()