import os
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-1.5-flash")

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

    response = model.generate_content(prompt)
    return response.text