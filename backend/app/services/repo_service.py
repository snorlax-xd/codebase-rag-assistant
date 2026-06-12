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
    search_similar_chunks,
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
            detail="Only HTTPS GitHub repository URLs are supported.",
        )

    repo_path = parsed.path.strip("/")
    if not _GITHUB_REPO_RE.match(repo_path):
        raise HTTPException(
            status_code=400,
            detail="Repository URL must look like https://github.com/owner/repo.",
        )

    owner, repo_name = repo_path.split("/", 1)
    repo_name = repo_name.removesuffix(".git")
    safe_name = f"{owner}__{repo_name}"
    return f"https://github.com/{owner}/{repo_name}.git", safe_name


def resolve_repository_path(repo_name: str) -> Path:
    """
    Resolves a repo name to its actual directory on disk.

    The backend stores repos as `owner__reponame` (e.g. `facebook__react`)
    but the frontend passes the short name (`react`) extracted from the URL.

    Resolution order:
    1. Exact match              -> repositories/facebook__react
    2. Suffix  __<repo_name>    -> any dir ending in __react
    3. Case-insensitive exact   -> repositories/React
    4. Falls back to canonical  -> repositories/react (caller checks .exists())

    Path traversal is always validated before returning.
    """
    base = REPO_BASE_PATH.resolve()

    def _safe(candidate: Path) -> Path:
        resolved = candidate.resolve()
        if resolved == base or base not in resolved.parents:
            raise HTTPException(status_code=400, detail="Invalid repository name.")
        return resolved

    # Strategy 1: exact
    exact = base / repo_name
    if exact.exists() and exact.is_dir():
        return _safe(exact)

    # Strategy 2: suffix match  owner__reponame
    try:
        suffix = f"__{repo_name.lower()}"
        for entry in base.iterdir():
            if entry.is_dir() and entry.name.lower().endswith(suffix):
                return _safe(entry)
    except (PermissionError, OSError):
        pass

    # Strategy 3: case-insensitive exact
    lower = repo_name.lower()
    try:
        for entry in base.iterdir():
            if entry.is_dir() and entry.name.lower() == lower:
                return _safe(entry)
    except (PermissionError, OSError):
        pass

    # Nothing found — return canonical so callers can do .exists() check
    return _safe(base / repo_name)


def clone_repository(repo_url: str):
    os.makedirs(REPO_BASE_PATH, exist_ok=True)
    normalized_url, repo_name = normalize_repo_url(repo_url)
    local_path = resolve_repository_path(repo_name)

    if local_path.exists():
        return {
            "status": "already_exists",
            "repo_name": repo_name,
            "path": str(local_path),
        }

    try:
        Repo.clone_from(
            normalized_url,
            str(local_path),
            depth=1,
            multi_options=[
                "--filter=blob:none",
                "--config=core.longpaths=true",
            ],
        )
    except GitCommandError as e:
        print("========== GIT CLONE ERROR ==========")
        print("STDERR:", e.stderr)
        print("STDOUT:", e.stdout)
        print("STATUS:", e.status)
        print("COMMAND:", e.command)
        print("=====================================")
        raise HTTPException(status_code=400, detail=f"Git clone failed: {e.stderr}")
    except Exception as e:
        print("========== UNKNOWN ERROR ==========")
        print(str(e))
        print("===================================")
        raise HTTPException(
            status_code=500, detail=f"Unexpected error during clone: {str(e)}"
        )

    return {
        "status": "cloned",
        "repo_name": repo_name,
        "path": str(local_path),
    }


def split_text(text: str, max_chars: int = 2000) -> list[str]:
    lines = text.splitlines(keepends=True)
    chunks: list[str] = []
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
    repo_path_obj = Path(repo_path).resolve()
    if not repo_path_obj.exists() or not repo_path_obj.is_dir():
        raise FileNotFoundError(f"Repository not found: {repo_path_obj}")

    create_collection()
    repo_name = os.path.basename(os.path.normpath(repo_path_obj))
    scanned_files = scan_repository(repo_path_obj)

    indexed_count = 0
    skipped_count = 0

    for file_data in scanned_files:
        parsed_data = file_data.get("parsed", {})
        functions = parsed_data.get("functions", [])
        classes = parsed_data.get("classes", [])

        chunks = functions + classes
        if not chunks and file_data.get("content"):
            chunks = [
                {
                    "type": "raw",
                    "name": file_data["file_name"],
                    "content": file_data["content"],
                    "start_line": 1,
                    "end_line": file_data["content"].count("\n") + 1,
                }
            ]

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
                        # Store the full folder name (e.g. facebook__react)
                        # so Qdrant filter matches correctly.
                        "repo_name": repo_name,
                        "path": file_data["path"],
                        "content": text_chunk,
                        "parsed": chunk,
                    }

                    store_embedding(payload_data, embedding)
                    indexed_count += 1
                    print(f"Indexed chunk {indexed_count} from {file_data['file_name']}")

                except Exception as e:
                    print(f"Skipping chunk from {file_data['file_name']}: {e}")
                    skipped_count += 1
                    continue

    return {
        "status": "indexed",
        "indexed_chunks": indexed_count,
        "skipped_chunks": skipped_count,
    }


def _resolve_qdrant_repo_name(short_name: str) -> str | None:
    """
    Given a short name like 'react', find what's actually stored in Qdrant
    by matching it to the on-disk folder name (e.g. 'facebook__react').
    Returns the full folder name, or None if not found.
    """
    base = REPO_BASE_PATH.resolve()
    try:
        suffix = f"__{short_name.lower()}"
        for entry in base.iterdir():
            if entry.is_dir() and entry.name.lower().endswith(suffix):
                return entry.name
        # Exact match fallback
        for entry in base.iterdir():
            if entry.is_dir() and entry.name.lower() == short_name.lower():
                return entry.name
    except (PermissionError, OSError):
        pass
    return None


def search_repository(query: str, repo_name: str | None = None):
    """
    Search indexed chunks.

    If repo_name is provided we resolve it to the actual folder name used
    in Qdrant (e.g. 'react' -> 'facebook__react') so the filter works.
    We no longer call resolve_repository_path here because that was
    throwing 404s for every search when the short name didn't match exactly.
    """
    qdrant_repo_name: str | None = None
    if repo_name:
        resolved = _resolve_qdrant_repo_name(repo_name)
        # Use resolved name if found; otherwise try raw name as-is
        # (handles repos that were stored without the owner__ prefix)
        qdrant_repo_name = resolved if resolved else repo_name

    query_embedding = generate_embedding(query)
    results = search_similar_chunks(query_embedding, repo_name=qdrant_repo_name)

    formatted_results = []
    for result in results:
        payload = result.payload or {}
        formatted_results.append(
            {
                "score": result.score,
                "file_name": payload.get("file_name"),
                "language": payload.get("language"),
                "repo_name": payload.get("repo_name"),
                "path": payload.get("path"),
                "content": payload.get("content", "")[:1000],
            }
        )

    return formatted_results