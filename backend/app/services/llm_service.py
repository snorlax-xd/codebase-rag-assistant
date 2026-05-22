import os
import requests


# Use SAME env variable everywhere
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

# Stable universally available Gemini model
MODEL_NAME = "gemini-pro"

# Prevent excessively huge prompts
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

        # Stop if context becomes too large
        if len(combined) + len(chunk) > MAX_CONTEXT_CHARS:
            break

        combined += chunk + "\n\n"

    # Fallback if no context found
    if not combined.strip():
        combined = "No relevant code context found."

    # Final RAG prompt
    prompt = f"""
You are an expert AI code assistant.

Answer the user's question using ONLY the provided code context.

Guidelines:
- Be precise
- Be technical
- Be concise
- Mention important functions/classes/files if relevant
- If the answer is not present in the context, clearly say so

CODE CONTEXT:
{combined.strip()}

QUESTION:
{query}

ANSWER:
"""

    # IMPORTANT:
    # gemini-pro works reliably with v1beta
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
            "maxOutputTokens": 1024,
            "topP": 0.8,
            "topK": 40
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:

        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=120
        )

        # Detailed error logging
        if response.status_code != 200:

            print("========== GEMINI GENERATION ERROR ==========")
            print("STATUS:", response.status_code)
            print("RESPONSE:", response.text)
            print("=============================================")

            raise Exception(
                f"Gemini generation failed: "
                f"{response.status_code} "
                f"{response.text}"
            )

        data = response.json()

        print("========== GEMINI RESPONSE ==========")
        print(data)
        print("=====================================")

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

    except requests.exceptions.RequestException as error:

        print("========== NETWORK ERROR ==========")
        print(str(error))
        print("===================================")

        raise Exception(
            f"Network error while calling Gemini API: {error}"
        )