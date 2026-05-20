from fastapi import APIRouter, BackgroundTasks, Query
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
def search_code(query: str = Query(..., min_length=1, max_length=2000)):
    results = search_repository(query)
    return {
        "query": query,
        "results": results
    }


def _ask_sync(query: str):
    query_embedding = generate_embedding(query)
    search_results = search_similar_chunks(query_embedding)

    context_chunks = []
    formatted_results = []

    for result in search_results:
        payload = result.payload
        content = payload.get("content", "")
        context_chunks.append(content)
        formatted_results.append({
            "score": result.score,
            "file_name": payload.get("file_name"),
            "path": payload.get("path")
        })

    final_answer = generate_response(query, context_chunks)

    return {
        "query": query,
        "answer": final_answer,
        "sources": formatted_results
    }


@router.get("/ask")
async def ask_question(query: str = Query(..., min_length=1, max_length=2000)):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, _ask_sync, query)
    return result