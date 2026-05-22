import os
import time

from google import genai
from google.genai import types


# ======================================================
# CONFIG
# ======================================================

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise Exception(
        "GOOGLE_API_KEY environment variable missing"
    )

# NEW OFFICIAL CLIENT
client = genai.Client(
    api_key=GOOGLE_API_KEY
)

# Stable modern model
MODEL_NAME = "gemini-2.5-flash"

MAX_CONTEXT_CHARS = 12000
MAX_RETRIES = 3


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
            > MAX_CONTEXT_CHARS
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

    for attempt in range(MAX_RETRIES):

        try:

            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    top_p=0.8,
                    top_k=40,
                    max_output_tokens=1024,
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

            if attempt < MAX_RETRIES - 1:

                wait_time = (attempt + 1) * 3

                print(
                    f"Retrying in {wait_time}s..."
                )

                time.sleep(wait_time)

                continue

    raise Exception(
        f"Gemini generation failed: {last_error}"
    )