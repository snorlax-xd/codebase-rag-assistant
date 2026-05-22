from git import Repo
from git.exc import GitCommandError
from fastapi import HTTPException
import os
from concurrent.futures import ThreadPoolExecutor

from app.services.file_service import scan_repository
from app.services.embedding_service import generate_embedding
from app.services.qdrant_service import (
    store_embedding,
    search_similar_chunks
)

REPO_BASE_PATH = "repositories"

executor = ThreadPoolExecutor(max_workers=4)


def clone_repository(repo_url: str):

    os.makedirs(REPO_BASE_PATH, exist_ok=True)

    # Better validation
    if not repo_url.startswith("https://github.com/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub repository URL"
        )

    # Handle trailing slash properly
    repo_name = (
        repo_url.rstrip("/")
        .split("/")[-1]
        .replace(".git", "")
    )

    local_path = os.path.join(REPO_BASE_PATH, repo_name)

    # If repo already exists
    if os.path.exists(local_path):
        return {
            "status": "already_exists",
            "path": local_path
        }

    try:

        Repo.clone_from(
            repo_url,
            local_path,
            depth=1
        )

    except GitCommandError as e:

        print("========== GIT CLONE ERROR ==========")
        print("STDERR:", e.stderr)
        print("STDOUT:", e.stdout)
        print("STATUS:", e.status)
        print("COMMAND:", e.command)
        print("=====================================")

        raise HTTPException(
            status_code=400,
            detail=f"Git clone failed: {e.stderr}"
        )

    except Exception as e:

        print("========== UNKNOWN ERROR ==========")
        print(str(e))
        print("===================================")

        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during clone: {str(e)}"
        )

    return {
        "status": "cloned",
        "path": local_path
    }


def split_text(text, max_chars=2000):

    lines = text.splitlines(keepends=True)

    chunks = []
    current = ""

    for line in lines:

        if len(current) + len(line) > max_chars and current:
            chunks.append(current)
            current = ""

        current += line

    if current:
        chunks.append(current)

    return chunks if chunks else [text]


def index_repository(repo_path: str):

    scanned_files = scan_repository(repo_path)

    indexed_count = 0
    skipped_count = 0

    for file_data in scanned_files:

        parsed_data = file_data.get("parsed", {})

        functions = parsed_data.get("functions", [])
        classes = parsed_data.get("classes", [])

        chunks = functions + classes

        for chunk in chunks:

            content = chunk.get("content", "")

            if not content.strip():
                continue

            text_chunks = split_text(content)

            for text_chunk in text_chunks:

                try:

                    embedding = generate_embedding(text_chunk)

                    payload_data = {
                        "file_name": file_data["file_name"],
                        "language": file_data["language"],
                        "path": file_data["path"],
                        "content": text_chunk,
                        "parsed": chunk
                    }

                    store_embedding(payload_data, embedding)

                    indexed_count += 1

                    print(
                        f"Indexed chunk {indexed_count} "
                        f"from {file_data['file_name']}"
                    )

                except Exception as e:

                    print(
                        f"Skipping chunk from "
                        f"{file_data['file_name']}: {e}"
                    )

                    skipped_count += 1
                    continue

    return {
        "status": "indexed",
        "indexed_chunks": indexed_count,
        "skipped_chunks": skipped_count
    }


def search_repository(query):

    query_embedding = generate_embedding(query)

    results = search_similar_chunks(query_embedding)

    formatted_results = []

    for result in results:

        payload = result.payload or {}

        formatted_results.append({
            "score": result.score,
            "file_name": payload.get("file_name"),
            "path": payload.get("path"),
            "content": payload.get("content", "")[:1000]
        })

    return formatted_results