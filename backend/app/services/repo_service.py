from git import Repo
from git.exc import GitCommandError
from fastapi import HTTPException
import os
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

from app.services.file_service import scan_repository
from app.services.embedding_service import generate_embedding
from app.services.qdrant_service import (
    create_collection,
    store_embedding,
    search_similar_chunks
)
from app.config import get_settings

settings = get_settings()
REPO_BASE_PATH = settings.repositories_path

executor = ThreadPoolExecutor(max_workers=settings.index_workers)

_GITHUB_REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?$")


def normalize_repo_url(repo_url: str) -> tuple[str, str]:
    parsed = urlparse(repo_url.strip())
    if parsed.scheme != "https" or parsed.netloc.lower() != "github.com":
        raise HTTPException(
            status_code=400,
            detail="Only HTTPS GitHub repository URLs are supported."
        )

    repo_path = parsed.path.strip("/")
    if not _GITHUB_REPO_RE.match(repo_path):
        raise HTTPException(
            status_code=400,
            detail="Repository URL must look like https://github.com/owner/repo."
        )

    owner, repo_name = repo_path.split("/", 1)
    repo_name = repo_name.removesuffix(".git")
    safe_name = f"{owner}__{repo_name}"
    return f"https://github.com/{owner}/{repo_name}.git", safe_name


def resolve_repository_path(repo_name: str) -> Path:
    candidate = (REPO_BASE_PATH / repo_name).resolve()
    base = REPO_BASE_PATH.resolve()
    if candidate == base or base not in candidate.parents:
        raise HTTPException(
            status_code=400,
            detail="Invalid repository name."
        )
    return candidate


def clone_repository(repo_url: str):

    os.makedirs(REPO_BASE_PATH, exist_ok=True)
    normalized_url, repo_name = normalize_repo_url(repo_url)
    local_path = resolve_repository_path(repo_name)

    # If repo already exists
    if os.path.exists(local_path):
        return {
            "status": "already_exists",
            "repo_name": repo_name,
            "path": str(local_path)
        }

    try:

        Repo.clone_from(
            normalized_url,
            str(local_path),
            depth=1,
            multi_options=[
                "--filter=blob:none",
                f"--config=core.longpaths=true",
            ]
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
        "repo_name": repo_name,
        "path": str(local_path)
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

    repo_path = Path(repo_path).resolve()
    if not repo_path.exists() or not repo_path.is_dir():
        raise FileNotFoundError(f"Repository not found: {repo_path}")

    create_collection()
    repo_name = os.path.basename(os.path.normpath(repo_path))
    scanned_files = scan_repository(repo_path)

    indexed_count = 0
    skipped_count = 0

    for file_data in scanned_files:

        parsed_data = file_data.get("parsed", {})

        functions = parsed_data.get("functions", [])
        classes = parsed_data.get("classes", [])

        chunks = functions + classes
        if not chunks and file_data.get("content"):
            chunks = [{
                "type": "raw",
                "name": file_data["file_name"],
                "content": file_data["content"],
                "start_line": 1,
                "end_line": file_data["content"].count("\n") + 1
            }]

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
                        "repo_name": repo_name,
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


def search_repository(query, repo_name=None):

    if repo_name:
        resolve_repository_path(repo_name)

    query_embedding = generate_embedding(query)

    results = search_similar_chunks(query_embedding, repo_name=repo_name)

    formatted_results = []

    for result in results:

        payload = result.payload or {}

        formatted_results.append({
            "score": result.score,
            "file_name": payload.get("file_name"),
            "language": payload.get("language"),
            "repo_name": payload.get("repo_name"),
            "path": payload.get("path"),
            "content": payload.get("content", "")[:1000]
        })

    return formatted_results
