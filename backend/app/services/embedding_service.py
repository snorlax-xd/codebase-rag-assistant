import os
from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_embedding(text: str):
    result = client.models.embed_content(
        model="models/text-embedding-004",
        contents=text
    )
    return result.embeddings[0].values