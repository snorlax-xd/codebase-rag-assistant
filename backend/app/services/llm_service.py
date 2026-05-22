import os
import time
import google.generativeai as genai


# ==========================================
# CONFIG
# ==========================================

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise Exception(
        "GOOGLE_API_KEY environment variable missing"
    )

genai.configure(api_key=GOOGLE_API_KEY)

# MOST STABLE MODEL
MODEL_NAME = "gemini-1.5-flash"

# Context safety
MAX_CONTEXT_CHARS = 12000

# Retry config
MAX_RETRIES = 3


# ==========================================
# MODEL INITIALIZATION
# ==========================================

model = genai.GenerativeModel(MODEL_NAME)


# ==========================================
# RESPONSE GENERATION
# ==========================================

def generate_response(
    query: str,
    context_chunks: list[str]
) -> str:

    # --------------------------------------
    # Build context safely
    # --------------------------------------

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

    # --------------------------------------
    # Prompt
    # --------------------------------------

    prompt = f"""
You are an expert AI codebase assistant.

Your responsibilities:
- Analyze repository code
- Answer technically and accurately
- Mention relevant functions/classes/files
- NEVER hallucinate
- If information is unavailable, clearly say so

==================================
CODE CONTEXT
==================================

{combined_context.strip()}

==================================
QUESTION
==================================

{query}

==================================
ANSWER
==================================
"""

    # --------------------------------------
    # Retry loop
    # --------------------------------------

    for attempt in range(MAX_RETRIES):

        try:

            response = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.2,
                    "top_p": 0.8,
                    "top_k": 40,
                    "max_output_tokens": 1024,
                }
            )

            # ----------------------------------
            # Validate response
            # ----------------------------------

            if not response:
                raise Exception(
                    "Empty Gemini response object"
                )

            if not hasattr(response, "text"):
                raise Exception(
                    f"Gemini response missing text: {response}"
                )

            answer = response.text.strip()

            if not answer:
                raise Exception(
                    "Gemini returned empty answer"
                )

            print("========== GEMINI SUCCESS ==========")
            print(answer[:500])
            print("====================================")

            return answer

        except Exception as error:

            print("========== GEMINI ERROR ==========")
            print(str(error))
            print("==================================")

            # Retry for transient failures
            if attempt < MAX_RETRIES - 1:

                wait_time = (attempt + 1) * 3

                print(
                    f"Retrying in {wait_time}s..."
                )

                time.sleep(wait_time)

                continue

            raise Exception(
                f"Gemini generation failed: {error}"
            )

    raise Exception(
        "Gemini generation failed after retries"
    )