import logging

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from ..models import QueryRequest, QueryResponse
from ..services.rag_chain import query_rag, stream_rag

router = APIRouter(prefix="/api", tags=["query"])
logger = logging.getLogger(__name__)


@router.post(
    "/query",
    summary="Query the RAG pipeline",
    response_model=QueryResponse,
    responses={200: {"description": "Streamed plain-text answer when stream=true"}},
)
async def query_documents(request: QueryRequest):
    if not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query cannot be empty",
        )

    k = min(request.num_results or 4, 10)

    if request.stream:
        async def generate():
            async for token in stream_rag(request.query, num_results=k):
                yield token

        return StreamingResponse(generate(), media_type="text/plain")

    try:
        result = await query_rag(request.query, num_results=k)
        return QueryResponse(**result)
    except Exception as exc:
        logger.error("Query failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {exc}",
        )
