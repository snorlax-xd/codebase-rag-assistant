import os
import time
import requests


# ==============================
# CONFIG
# ==============================

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

# Most stable publicly supported model
MODEL_NAME = "gemini-1.5-flash-latest"

# Context size safety
MAX_CONTEXT_CHARS = 12000

# API timeout
REQUEST_TIMEOUT = 120


# ==============================
# RESPONSE GENERATION
# ==============================

def generate_response(
    query: str,
    context_chunks: list[str]
) -> str:

    # ------------------------------
    # Validate API key
    # ------------------------------
    if not GEMINI_API_KEY:
        raise Exception(
            "GOOGLE_API_KEY environment variable missing"
        )

    # ------------------------------
    # Build context safely
    # ------------------------------
    combined_context = ""

    for chunk in context_chunks:

        if not chunk:
            continue

        chunk = str(chunk).strip()

        if not chunk:
            continue

        # Prevent oversized prompt
        if (
            len(combined_context) + len(chunk)
            > MAX_CONTEXT_CHARS
        ):
            break

        combined_context += chunk + "\n\n"

    # Fallback if retrieval empty
    if not combined_context.strip():
        combined_context = (
            "No relevant code context found."
        )

    # ------------------------------
    # Final Prompt
    # ------------------------------
    prompt = f"""
You are an expert AI codebase assistant.

Your job:
- Analyze repository code context
- Answer accurately and technically
- Mention relevant files/functions/classes
- Never hallucinate missing code
- If information is missing, clearly say so

==============================
CODE CONTEXT
==============================

{combined_context.strip()}

==============================
QUESTION
==============================

{query}

==============================
ANSWER
==============================
"""

    # ------------------------------
    # Gemini Endpoint
    # ------------------------------
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
            "topP": 0.8,
            "topK": 40,
            "maxOutputTokens": 1024
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    # ------------------------------
    # Retry loop
    # ------------------------------
    retries = 3

    for attempt in range(retries):

        try:

            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=REQUEST_TIMEOUT
            )

            # =====================================
            # SUCCESS
            # =====================================
            if response.status_code == 200:

                try:
                    data = response.json()

                except Exception:
                    raise Exception(
                        "Failed to parse Gemini JSON response"
                    )

                # Debug logs
                print("========== GEMINI SUCCESS ==========")
                print(data)
                print("====================================")

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

            # =====================================
            # RETRYABLE ERRORS
            # =====================================
            if response.status_code in [
                429,
                500,
                502,
                503,
                504
            ]:

                wait_time = (attempt + 1) * 5

                print(
                    f"Gemini temporary error "
                    f"{response.status_code}. "
                    f"Retrying in {wait_time}s..."
                )

                print(response.text)

                time.sleep(wait_time)

                continue

            # =====================================
            # NON-RETRYABLE ERRORS
            # =====================================
            print("========== GEMINI ERROR ==========")
            print("STATUS:", response.status_code)
            print("RESPONSE:", response.text)
            print("==================================")

            raise Exception(
                f"Gemini API Error "
                f"{response.status_code}: "
                f"{response.text}"
            )

        except requests.exceptions.Timeout:

            print(
                f"Gemini timeout "
                f"(attempt {attempt + 1}/{retries})"
            )

            if attempt == retries - 1:
                raise Exception(
                    "Gemini request timed out"
                )

            time.sleep(3)

        except requests.exceptions.ConnectionError:

            print(
                f"Gemini connection error "
                f"(attempt {attempt + 1}/{retries})"
            )

            if attempt == retries - 1:
                raise Exception(
                    "Gemini connection failed"
                )

            time.sleep(3)

        except requests.exceptions.RequestException as error:

            print("========== NETWORK ERROR ==========")
            print(str(error))
            print("===================================")

            raise Exception(
                f"Network error while calling Gemini API: {error}"
            )

        except Exception as error:

            print("========== UNKNOWN ERROR ==========")
            print(str(error))
            print("===================================")

            raise

    # Final fallback
    raise Exception(
        "Gemini generation failed after retries"
    )