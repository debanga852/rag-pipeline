import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.models import HealthResponse
from backend.routers import documents, query
from backend.services.embeddings import get_embedding_model
from backend.services.vector_store import get_vector_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)s  %(levelname)s  %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting RAG Pipeline API ...")
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
    logger.info("Loading embedding model ...")
    get_embedding_model()
    logger.info("Initialising vector store ...")
    get_vector_store()
    logger.info("RAG Pipeline API ready")
    yield
    logger.info("Shutting down ...")


app = FastAPI(
    title="RAG Pipeline API",
    description=(
        "End-to-end Retrieval-Augmented Generation using "
        "LangChain, Claude AI (claude-sonnet-4-6), ChromaDB, and Sentence-Transformers."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(query.router)


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    return HealthResponse(
        status="healthy",
        model=settings.claude_model,
        embedding_model=settings.embedding_model,
        vector_store="ChromaDB",
    )


@app.get("/", tags=["root"])
async def root():
    return {"message": "RAG Pipeline API", "docs": "/docs", "health": "/api/health"}
