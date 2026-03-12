import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.config import settings
from backend.models import DeleteResponse, DocumentListResponse, DocumentResponse
from backend.services.document_processor import process_document
from backend.services.vector_store import (
    delete_document_chunks,
    document_exists,
    get_all_documents,
)

router = APIRouter(prefix="/api/documents", tags=["documents"])
logger = logging.getLogger(__name__)

_ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}
_MAX_BYTES = settings.max_upload_size_mb * 1024 * 1024


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a PDF or text file",
)
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename or "unknown"
    ext = Path(filename).suffix.lower()

    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(_ALLOWED_EXTENSIONS)}",
        )

    file_type = "pdf" if ext == ".pdf" else "text"
    safe_name = Path(filename).name  # prevent path traversal

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    temp_path = upload_dir / safe_name

    try:
        content = await file.read()

        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")

        if len(content) > _MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum size of {settings.max_upload_size_mb} MB",
            )

        temp_path.write_bytes(content)

        result = await process_document(
            file_path=str(temp_path),
            filename=safe_name,
            file_type=file_type,
            size_bytes=len(content),
        )
        return DocumentResponse(**result)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to process document '%s': %s", safe_name, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {exc}",
        )
    finally:
        if temp_path.exists():
            temp_path.unlink()


@router.get("/", response_model=DocumentListResponse, summary="List all indexed documents")
async def list_documents():
    try:
        docs = get_all_documents()
        return DocumentListResponse(
            documents=[DocumentResponse(**d) for d in docs],
            total=len(docs),
        )
    except Exception as exc:
        logger.error("Failed to list documents: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document list",
        )


@router.delete(
    "/{document_id}",
    response_model=DeleteResponse,
    summary="Delete a document from the index",
)
async def delete_document(document_id: str):
    if not document_exists(document_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found",
        )
    try:
        removed = delete_document_chunks(document_id)
        return DeleteResponse(
            message=f"Deleted successfully ({removed} chunks removed)",
            document_id=document_id,
        )
    except Exception as exc:
        logger.error("Failed to delete document '%s': %s", document_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document",
        )
