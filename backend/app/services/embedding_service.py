import os
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def generate_embedding(text: str):
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text
    )
    return result["embedding"]