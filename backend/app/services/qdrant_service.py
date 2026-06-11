from qdrant_client import QdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue, VectorParams
from qdrant_client.models import PointStruct
import uuid
import os


client = QdrantClient(
    host=os.getenv("QDRANT_HOST", "localhost"),
    port=int(os.getenv("QDRANT_PORT", 6333))
)

COLLECTION_NAME = "codebase_chunks"
EMBEDDING_DIM = 3072

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

    return {"status": "already_exists", "collection": COLLECTION_NAME}


def store_embedding(file_data, embedding):

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
        limit=5
    )
    return search_results.points

