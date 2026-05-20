import ollama


def generate_response(query: str, context_chunks):

    context_text = "\n\n".join(context_chunks)

    prompt = f"""
You are an expert code assistant.

Answer the user's question using ONLY the provided code context.

CODE CONTEXT:
{context_text}

QUESTION:
{query}

ANSWER:
"""

    response = ollama.chat(
        model="llama3",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response["message"]["content"]

