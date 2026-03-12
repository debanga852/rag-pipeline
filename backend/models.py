from pydantic import BaseModel
from typing import List, Optional


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    chunk_count: int
    uploaded_at: str
    size_bytes: int


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


class QueryRequest(BaseModel):
    query: str
    num_results: Optional[int] = 4
    stream: Optional[bool] = False


class Source(BaseModel):
    document_id: str
    filename: str
    chunk_index: int
    content: str


class QueryResponse(BaseModel):
    answer: str
    sources: List[Source]
    query: str


class DeleteResponse(BaseModel):
    message: str
    document_id: str


class HealthResponse(BaseModel):
    status: str
    model: str
    embedding_model: str
    vector_store: str
