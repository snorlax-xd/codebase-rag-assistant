from fastapi import APIRouter, BackgroundTasks, Query
from fastapi import HTTPException
from pathlib import Path
import asyncio

from app.services.repo_service import (
    clone_repository,
    index_repository,
    search_repository,
    executor
)
from app.services.file_service import scan_repository
from app.services.qdrant_service import create_collection, search_similar_chunks
from app.services.embedding_service import generate_embedding
from app.services.llm_service import generate_response


router = APIRouter()


@router.post("/clone-repo")
def clone_repo(repo_url: str = Query(..., min_length=1, max_length=2000)):
    result = clone_repository(repo_url)
    return result


@router.get("/scan-repo")
def scan_repo(repo_name: str = Query(..., min_length=1, max_length=200)):
    repo_path = f"repositories/{repo_name}"
    if not Path(repo_path).exists():
        raise HTTPException(
            status_code=404,
            detail="Repository is not cloned on the backend. Add or re-index it first."
        )
    scanned_files = scan_repository(repo_path)
    return {
        "repository": repo_name,
        "total_files": len(scanned_files),
        "files": scanned_files
    }


@router.post("/create-collection")
def create_qdrant_collection():
    return create_collection()


@router.post("/index-repo")
async def index_repo(
    repo_name: str = Query(..., min_length=1, max_length=200),
    background_tasks: BackgroundTasks = None
):
    repo_path = f"repositories/{repo_name}"
    background_tasks.add_task(index_repository, repo_path)
    return {
        "status": "indexing_started",
        "repo": repo_name,
        "message": "Indexing is running in the background. Query /search once complete."
    }


@router.get("/search")
def search_code(
    query: str = Query(..., min_length=1, max_length=2000),
    repo_name: str | None = Query(None, min_length=1, max_length=200)
):
    results = search_repository(query, repo_name=repo_name)
    return {
        "query": query,
        "repo_name": repo_name,
        "results": results
    }


def _ask_sync(query: str, repo_name: str | None = None):
    query_embedding = generate_embedding(query)
    search_results = search_similar_chunks(query_embedding, repo_name=repo_name)

    context_chunks = []
    formatted_results = []

    for result in search_results:
        payload = result.payload
        content = payload.get("content", "")
        context_chunks.append(content)
        formatted_results.append({
            "score": result.score,
            "file_name": payload.get("file_name"),
            "language": payload.get("language"),
            "repo_name": payload.get("repo_name"),
            "path": payload.get("path"),
            "content": content
        })

    final_answer = generate_response(query, context_chunks)

    return {
        "query": query,
        "repo_name": repo_name,
        "answer": final_answer,
        "sources": formatted_results
    }


@router.get("/ask")
async def ask_question(
    query: str = Query(..., min_length=1, max_length=2000),
    repo_name: str | None = Query(None, min_length=1, max_length=200)
):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, _ask_sync, query, repo_name)
    return result


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
        "status": str(info.status)
    }
