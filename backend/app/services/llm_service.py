import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MAX_CONTEXT_CHARS = 6000

def generate_response(query: str, context_chunks: list[str]) -> str:
    combined = ""
    for chunk in context_chunks:
        if len(combined) + len(chunk) > MAX_CONTEXT_CHARS:
            break
        combined += chunk + "\n\n"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are an expert code assistant. Answer using ONLY the provided code context. Be precise and technical."
            },
            {
                "role": "user",
                "content": f"CODE CONTEXT:\n{combined.strip()}\n\nQUESTION:\n{query}"
            }
        ],
        max_tokens=1000,
        temperature=0.2
    )
    return response.choices[0].message.content