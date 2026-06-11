from qdrant_client import QdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue, VectorParams
from qdrant_client.models import PointStruct
import uuid
from fastapi import HTTPException
from app.config import get_settings

settings = get_settings()

client = QdrantClient(
    host=settings.qdrant_host,
    port=settings.qdrant_port
)

COLLECTION_NAME = settings.qdrant_collection
EMBEDDING_DIM = settings.embedding_dim


def _collection_vector_size(info):
    vectors = info.config.params.vectors
    if hasattr(vectors, "size"):
        return vectors.size
    if isinstance(vectors, dict) and "" in vectors:
        return vectors[""].size
    return None


def create_collection():
    collections = client.get_collections().collections
    collection_names = [c.name for c in collections]

    if COLLECTION_NAME not in collection_names:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=EMBEDDING_DIM,
                distance=Distance.COSINE
            )
        )
        return {"status": "created", "collection": COLLECTION_NAME}

    info = client.get_collection(COLLECTION_NAME)
    configured_size = _collection_vector_size(info)
    if configured_size is not None and configured_size != EMBEDDING_DIM:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Qdrant collection '{COLLECTION_NAME}' has vector size "
                f"{configured_size}, but EMBEDDING_DIM is {EMBEDDING_DIM}."
            )
        )

    return {"status": "already_exists", "collection": COLLECTION_NAME}


def store_embedding(file_data, embedding):

    create_collection()

    client.upsert(
        collection_name=COLLECTION_NAME,

        points=[

            PointStruct(
                id=str(uuid.uuid4()),

                vector=embedding,

                payload={

                    "file_name": file_data["file_name"],
                    "language": file_data["language"],
                    "repo_name": file_data.get("repo_name"),
                    "path": file_data["path"],

                    "content": file_data.get("content", ""),

                    "parsed": file_data.get("parsed", {})
                }
            )
        ]
    )

    return {
        "status": "stored"
    }


def search_similar_chunks(query_embedding, repo_name=None):
    create_collection()
    query_filter = None
    if repo_name:
        query_filter = Filter(
            must=[
                FieldCondition(
                    key="repo_name",
                    match=MatchValue(value=repo_name)
                )
            ]
        )

    search_results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        query_filter=query_filter,
        limit=settings.search_limit
    )
    return search_results.points

