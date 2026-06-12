from fastapi import APIRouter, BackgroundTasks, Query
from fastapi import HTTPException
import asyncio
import threading

from app.services.repo_service import (
    clone_repository,
    index_repository,
    resolve_repository_path,
    search_repository,
    executor,
)
from app.services.file_service import scan_repository
from app.services.qdrant_service import create_collection, search_similar_chunks
from app.services.embedding_service import generate_embedding
from app.services.llm_service import generate_response
from app.config import get_settings

settings = get_settings()
router = APIRouter()

# ── In-memory indexing progress tracker ──────────────────────────────────────
# Maps repo_name -> {"status": "indexing"|"done"|"error", "indexed": int, "total": int}
_index_progress: dict[str, dict] = {}
_index_lock = threading.Lock()


# ── Repo management ───────────────────────────────────────────────────────────

@router.post("/clone-repo")
def clone_repo(repo_url: str = Query(..., min_length=1, max_length=2000)):
    return clone_repository(repo_url)


@router.get("/scan-repo")
def scan_repo(repo_name: str = Query(..., min_length=1, max_length=200)):
    repo_path = resolve_repository_path(repo_name)
    if not repo_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Repository is not cloned on the backend. Add or re-index it first.",
        )
    scanned_files = scan_repository(repo_path)
    return {
        "repository": repo_name,
        "total_files": len(scanned_files),
        "files": scanned_files,
    }


@router.post("/create-collection")
def create_qdrant_collection():
    return create_collection()


@router.post("/index-repo")
async def index_repo(
    repo_name: str = Query(..., min_length=1, max_length=200),
    background_tasks: BackgroundTasks = None,
):
    repo_path = resolve_repository_path(repo_name)
    if not repo_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Repository is not cloned on the backend. Add it before indexing.",
        )

    # Reset progress
    with _index_lock:
        _index_progress[repo_name] = {"status": "indexing", "indexed": 0, "total": 0, "error": None}

    def _run_and_track():
        try:
            result = index_repository(str(repo_path))
            with _index_lock:
                _index_progress[repo_name] = {
                    "status": "done",
                    "indexed": result.get("indexed_chunks", 0),
                    "total": result.get("indexed_chunks", 0) + result.get("skipped_chunks", 0),
                    "error": None,
                }
        except Exception as e:
            with _index_lock:
                _index_progress[repo_name] = {
                    "status": "error",
                    "indexed": 0,
                    "total": 0,
                    "error": str(e),
                }

    background_tasks.add_task(_run_and_track)

    return {
        "status": "indexing_started",
        "repo": repo_name,
        "message": "Indexing is running in the background. Poll /index-status for progress.",
    }


@router.get("/index-status")
def index_status(repo_name: str = Query(..., min_length=1, max_length=200)):
    """Poll this endpoint to track indexing progress."""
    with _index_lock:
        progress = _index_progress.get(repo_name)
    if not progress:
        return {"status": "unknown", "repo": repo_name}
    return {"repo": repo_name, **progress}


# ── Search ────────────────────────────────────────────────────────────────────

@router.get("/search")
def search_code(
    query: str = Query(..., min_length=1, max_length=2000),
    repo_name: str | None = Query(None, min_length=1, max_length=200),
):
    results = search_repository(query, repo_name=repo_name)
    return {
        "query": query,
        "repo_name": repo_name,
        "results": results,
    }


# ── Ask / RAG ─────────────────────────────────────────────────────────────────

def _ask_sync(query: str, repo_name: str | None = None):
    from app.services.repo_service import _resolve_qdrant_repo_name

    # Resolve short name to full folder name for accurate Qdrant filtering
    qdrant_repo_name: str | None = None
    if repo_name:
        resolved = _resolve_qdrant_repo_name(repo_name)
        qdrant_repo_name = resolved if resolved else repo_name

    query_embedding = generate_embedding(query)
    search_results = search_similar_chunks(query_embedding, repo_name=qdrant_repo_name)

    context_chunks = []
    formatted_results = []

    for result in search_results:
        payload = result.payload or {}
        content = payload.get("content", "")
        context_chunks.append(content)
        formatted_results.append(
            {
                "score": result.score,
                "file_name": payload.get("file_name"),
                "language": payload.get("language"),
                "repo_name": payload.get("repo_name"),
                "path": payload.get("path"),
                "content": content,
            }
        )

    # Pass repo_name into generate_response so the prompt is contextualised
    final_answer = generate_response(query, context_chunks, repo_name=repo_name)

    return {
        "query": query,
        "repo_name": repo_name,
        "answer": final_answer,
        "sources": formatted_results,
    }


@router.get("/ask")
async def ask_question(
    query: str = Query(..., min_length=1, max_length=2000),
    repo_name: str | None = Query(None, min_length=1, max_length=200),
):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, _ask_sync, query, repo_name)
    return result


# ── Settings endpoint (exposes real config to frontend) ───────────────────────

@router.get("/settings")
def get_backend_settings():
    """Returns the active backend configuration so the Settings page is accurate."""
    return {
        "generation_model": settings.generation_model,
        "embedding_model": settings.embedding_model,
        "generation_max_output_tokens": settings.generation_max_output_tokens,
        "generation_temperature": settings.generation_temperature,
        "search_limit": settings.search_limit,
        "max_context_chars": settings.max_context_chars,
        "embedding_dim": settings.embedding_dim,
        "qdrant_collection": settings.qdrant_collection,
        "ignore_directories": sorted(settings.ignore_directories),
        "max_scan_files": settings.max_scan_files,
    }


# ── Collection management ─────────────────────────────────────────────────────

@router.delete("/delete-collection")
def delete_collection():
    from app.services.qdrant_service import client, COLLECTION_NAME
    client.delete_collection(COLLECTION_NAME)
    return {"status": "deleted", "collection": COLLECTION_NAME}


@router.get("/collection-info")
def collection_info():
    from app.services.qdrant_service import client, COLLECTION_NAME
    info = client.get_collection(COLLECTION_NAME)
    return {
        "vectors_count": info.vectors_count,
        "indexed_vectors_count": info.indexed_vectors_count,
        "status": str(info.status),
    }