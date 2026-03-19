import asyncio
import logging
from typing import AsyncIterator

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from ..config import settings
from ..models import Source
from .vector_store import get_vector_store

logger = logging.getLogger(__name__)

_RAG_SYSTEM_PROMPT = """\
You are a helpful AI assistant that answers questions based on provided context documents.

- Answer using ONLY the information from the provided context.
- If the context does not contain enough information, say so clearly.
- Be concise and accurate; synthesize information from multiple documents when relevant.
- Do not make up information that is not in the context."""

_RAG_USER_TEMPLATE = """\
Context:
{context}

Question: {question}

Please provide a comprehensive answer based on the context above."""


def _get_llm() -> ChatGroq:
    return ChatGroq(
        model=settings.groq_model,
        api_key=settings.groq_api_key,
        max_tokens=2048,
    )


def _format_docs(docs) -> str:
    parts = []
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("filename", "Unknown")
        parts.append(f"[Document {i} — {source}]\n{doc.page_content}")
    return "\n\n---\n\n".join(parts)


def _build_messages(query: str, docs) -> list:
    context = _format_docs(docs)
    return [
        SystemMessage(content=_RAG_SYSTEM_PROMPT),
        HumanMessage(content=_RAG_USER_TEMPLATE.format(context=context, question=query)),
    ]


def _build_sources(docs) -> list[Source]:
    return [
        Source(
            document_id=doc.metadata.get("document_id", ""),
            filename=doc.metadata.get("filename", "Unknown"),
            chunk_index=int(doc.metadata.get("chunk_index", 0)),
            content=(
                doc.page_content[:500] + "..."
                if len(doc.page_content) > 500
                else doc.page_content
            ),
        )
        for doc in docs
    ]


async def _retrieve(query: str, k: int):
    vs = get_vector_store()
    retriever = vs.as_retriever(search_type="similarity", search_kwargs={"k": k})
    return await retriever.ainvoke(query)


async def query_rag(query: str, num_results: int = 4) -> dict:
    """Retrieve relevant chunks and generate an answer with Groq."""
    docs = await _retrieve(query, num_results)

    if not docs:
        return {
            "answer": "No relevant documents found in the knowledge base. Please upload some documents first.",
            "sources": [],
            "query": query,
        }

    messages = _build_messages(query, docs)
    llm = _get_llm()
    response = await llm.ainvoke(messages)

    return {
        "answer": response.content,
        "sources": _build_sources(docs),
        "query": query,
    }


async def stream_rag(query: str, num_results: int = 4) -> AsyncIterator[str]:
    """Stream the RAG answer token by token."""
    docs = await _retrieve(query, num_results)

    if not docs:
        yield "No relevant documents found. Please upload some documents first."
        return

    messages = _build_messages(query, docs)
    llm = _get_llm()

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content
