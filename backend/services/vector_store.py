import logging
from langchain_chroma import Chroma
from backend.config import settings
from backend.services.embeddings import get_embedding_model

logger = logging.getLogger(__name__)

_vector_store: Chroma | None = None


def get_vector_store() -> Chroma:
    global _vector_store
    if _vector_store is None:
        embeddings = get_embedding_model()
        _vector_store = Chroma(
            collection_name=settings.chroma_collection_name,
            embedding_function=embeddings,
            persist_directory=settings.chroma_persist_dir,
        )
        logger.info("ChromaDB vector store initialized")
    return _vector_store


def delete_document_chunks(document_id: str) -> int:
    """Delete all chunks belonging to a document. Returns number deleted."""
    vs = get_vector_store()
    collection = vs._collection
    results = collection.get(
        where={"document_id": document_id},
        include=["metadatas"],
    )
    if results["ids"]:
        collection.delete(ids=results["ids"])
        return len(results["ids"])
    return 0


def get_all_documents() -> list[dict]:
    """Return unique documents by aggregating chunk metadata."""
    vs = get_vector_store()
    collection = vs._collection
    results = collection.get(include=["metadatas"])

    seen: dict[str, dict] = {}
    for metadata in results.get("metadatas") or []:
        if not metadata or "document_id" not in metadata:
            continue
        doc_id = metadata["document_id"]
        if doc_id not in seen:
            seen[doc_id] = {
                "id": doc_id,
                "filename": metadata.get("filename", "unknown"),
                "file_type": metadata.get("file_type", "unknown"),
                "uploaded_at": metadata.get("uploaded_at", ""),
                "size_bytes": int(metadata.get("size_bytes", 0)),
                "chunk_count": 0,
            }
        seen[doc_id]["chunk_count"] += 1

    return list(seen.values())


def document_exists(document_id: str) -> bool:
    vs = get_vector_store()
    collection = vs._collection
    results = collection.get(
        where={"document_id": document_id},
        limit=1,
        include=["metadatas"],
    )
    return len(results["ids"]) > 0
