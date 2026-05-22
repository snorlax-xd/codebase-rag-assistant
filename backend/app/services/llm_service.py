import os
import time
import google.generativeai as genai
from google.api_core.exceptions import (
    ResourceExhausted,
    DeadlineExceeded,
    ServiceUnavailable,
    GoogleAPIError,
)


# =========================================================
# CONFIG
# =========================================================

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise Exception(
        "GOOGLE_API_KEY environment variable missing"
    )

genai.configure(api_key=GOOGLE_API_KEY)


# =========================================================
# FALLBACK MODEL CHAIN
# =========================================================

# Railway-safe fallback order
MODEL_CANDIDATES = [
    "gemini-1.0-pro",
    "gemini-pro",
    "models/gemini-1.0-pro",
]

# Prompt limits
MAX_CONTEXT_CHARS = 12000

# Retry limits
MAX_RETRIES = 3


# =========================================================
# BUILD PROMPT
# =========================================================

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
            "No relevant code context found."
        )

    prompt = f"""
You are an expert AI codebase assistant.

Your job:
- Analyze repository code
- Answer accurately
- Mention relevant files/classes/functions
- NEVER hallucinate
- If context is insufficient, clearly say so

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


# =========================================================
# TRY SINGLE MODEL
# =========================================================

def try_model(model_name: str, prompt: str):

    print(f"Trying Gemini model: {model_name}")

    model = genai.GenerativeModel(model_name)

    response = model.generate_content(
        prompt,
        generation_config={
            "temperature": 0.2,
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 1024,
        }
    )

    if not response:
        raise Exception(
            f"Empty response from {model_name}"
        )

    if not hasattr(response, "text"):
        raise Exception(
            f"No text field in response from {model_name}"
        )

    text = response.text.strip()

    if not text:
        raise Exception(
            f"Empty text returned by {model_name}"
        )

    return text


# =========================================================
# MAIN RESPONSE FUNCTION
# =========================================================

def generate_response(
    query: str,
    context_chunks: list[str]
) -> str:

    prompt = build_prompt(
        query,
        context_chunks
    )

    last_error = None

    # -----------------------------------------------------
    # MODEL FALLBACK LOOP
    # -----------------------------------------------------

    for model_name in MODEL_CANDIDATES:

        for attempt in range(MAX_RETRIES):

            try:

                answer = try_model(
                    model_name,
                    prompt
                )

                print("========== GEMINI SUCCESS ==========")
                print(f"MODEL: {model_name}")
                print(answer[:500])
                print("====================================")

                return answer

            except ResourceExhausted as error:

                last_error = error

                wait_time = (attempt + 1) * 5

                print(
                    f"Rate limit hit for {model_name}. "
                    f"Retrying in {wait_time}s..."
                )

                time.sleep(wait_time)

            except (
                DeadlineExceeded,
                ServiceUnavailable
            ) as error:

                last_error = error

                wait_time = (attempt + 1) * 3

                print(
                    f"Temporary Gemini outage for "
                    f"{model_name}. "
                    f"Retrying in {wait_time}s..."
                )

                time.sleep(wait_time)

            except GoogleAPIError as error:

                last_error = error

                print("========== GOOGLE API ERROR ==========")
                print(f"MODEL: {model_name}")
                print(str(error))
                print("======================================")

                # Move to next model
                break

            except Exception as error:

                last_error = error

                print("========== GEMINI ERROR ==========")
                print(f"MODEL: {model_name}")
                print(str(error))
                print("==================================")

                # Move to next model
                break

    # -----------------------------------------------------
    # TOTAL FAILURE
    # -----------------------------------------------------

    raise Exception(
        f"All Gemini models failed. "
        f"Last error: {last_error}"
    )