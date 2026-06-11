import time
from functools import lru_cache
from fastapi import HTTPException

from google import genai
from google.genai import types
from app.config import get_settings


settings = get_settings()


@lru_cache
def get_genai_client():
    if not settings.google_api_key:
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_API_KEY is not configured on the backend."
        )
    return genai.Client(api_key=settings.google_api_key)


# ======================================================
# PROMPT BUILDER
# ======================================================

def build_prompt(
    query: str,
    context_chunks: list[str]
) -> str:

    combined_context = ""

    for chunk in context_chunks:

        if not chunk:
            continue

        chunk = str(chunk).strip()

        if not chunk:
            continue

        if (
            len(combined_context) + len(chunk)
            > settings.max_context_chars
        ):
            break

        combined_context += chunk + "\n\n"

    if not combined_context.strip():
        combined_context = (
            "No relevant repository context found."
        )

    prompt = f"""
You are an expert AI codebase assistant.

Your tasks:
- Analyze repository code
- Explain logic clearly
- Mention relevant files/classes/functions
- Never hallucinate
- If information is missing, say so clearly

==================================================
CODE CONTEXT
==================================================

{combined_context.strip()}

==================================================
QUESTION
==================================================

{query}

==================================================
ANSWER
==================================================
"""

    return prompt


# ======================================================
# MAIN GENERATION
# ======================================================

def generate_response(
    query: str,
    context_chunks: list[str]
) -> str:

    prompt = build_prompt(
        query,
        context_chunks
    )

    last_error = None

    client = get_genai_client()

    for attempt in range(settings.generation_max_retries):

        try:

            response = client.models.generate_content(
                model=settings.generation_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    top_p=0.8,
                    top_k=40,
                    max_output_tokens=settings.generation_max_output_tokens,
                )
            )

            if not response:
                raise Exception(
                    "Empty Gemini response"
                )

            if not response.text:
                raise Exception(
                    f"Gemini returned empty text: {response}"
                )

            answer = response.text.strip()

            print("========== GEMINI SUCCESS ==========")
            print(answer[:500])
            print("====================================")

            return answer

        except Exception as error:

            last_error = error

            print("========== GEMINI ERROR ==========")
            print(str(error))
            print("==================================")

            if attempt < settings.generation_max_retries - 1:

                wait_time = (attempt + 1) * 3

                print(
                    f"Retrying in {wait_time}s..."
                )

                time.sleep(wait_time)

                continue

    raise Exception(
        f"Gemini generation failed: {last_error}"
    )
