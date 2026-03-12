import asyncio
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.config import settings
from backend.services.vector_store import get_vector_store

logger = logging.getLogger(__name__)


def _get_text_splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""],
    )


def _load_and_split(file_path: str, file_type: str) -> List[Document]:
    if file_type == "pdf":
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path, encoding="utf-8")

    raw_docs = loader.load()
    splitter = _get_text_splitter()
    return splitter.split_documents(raw_docs)


async def process_document(
    file_path: str,
    filename: str,
    file_type: str,
    size_bytes: int,
) -> dict:
    """Load, split, embed, and store a document in ChromaDB."""
    document_id = str(uuid.uuid4())
    uploaded_at = datetime.now(timezone.utc).isoformat()

    # Run synchronous loaders in a thread to avoid blocking the event loop
    chunks: List[Document] = await asyncio.to_thread(
        _load_and_split, file_path, file_type
    )

    if not chunks:
        raise ValueError("No content could be extracted from the document")

    # Attach metadata to every chunk
    for i, chunk in enumerate(chunks):
        chunk.metadata.update(
            {
                "document_id": document_id,
                "filename": filename,
                "file_type": file_type,
                "uploaded_at": uploaded_at,
                "size_bytes": size_bytes,
                "chunk_index": i,
            }
        )

    vs = get_vector_store()
    chunk_ids = [f"{document_id}_{i}" for i in range(len(chunks))]

    await asyncio.to_thread(vs.add_documents, chunks, ids=chunk_ids)

    logger.info("Stored %d chunks for document '%s' (id=%s)", len(chunks), filename, document_id)

    return {
        "id": document_id,
        "filename": filename,
        "file_type": file_type,
        "chunk_count": len(chunks),
        "uploaded_at": uploaded_at,
        "size_bytes": size_bytes,
    }
