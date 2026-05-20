from fastapi import FastAPI
from app.api.repo_api import router as repo_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(repo_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Codebase RAG Backend Running"}