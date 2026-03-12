# RAG Pipeline

An AI-powered Retrieval-Augmented Generation (RAG) system that lets you upload documents and query them using Claude AI. Built with FastAPI, LangChain, ChromaDB, and React.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React)                         │
│  ┌──────────────────────┐      ┌──────────────────────────────┐ │
│  │   Document Panel     │      │        Chat Panel            │ │
│  │  • Drag-drop upload  │      │  • Conversational interface  │ │
│  │  • Document list     │      │  • Source citations          │ │
│  │  • Delete docs       │      │  • Streaming responses       │ │
│  └──────────────────────┘      └──────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / REST
┌───────────────────────────▼─────────────────────────────────────┐
│                      FastAPI Backend                            │
│  ┌──────────────────┐        ┌─────────────────────────────┐   │
│  │  /api/documents  │        │        /api/query           │   │
│  │  • Upload        │        │  • Similarity search        │   │
│  │  • List          │        │  • Context assembly         │   │
│  │  • Delete        │        │  • Claude API call          │   │
│  └──────────────────┘        └─────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────┐        ┌─────────────────────────────┐   │
│  │ Document         │        │       RAG Chain              │   │
│  │ Processor        │        │  LangChain + Claude AI       │   │
│  │ (Chunk + Embed)  │        │  (claude-sonnet-4-6)         │   │
│  └────────┬─────────┘        └──────────────┬──────────────┘   │
└───────────┼──────────────────────────────────┼──────────────────┘
            │                                  │
┌───────────▼──────────────────────────────────▼──────────────────┐
│                        ChromaDB                                 │
│            Persistent vector store (all-MiniLM-L6-v2)           │
└─────────────────────────────────────────────────────────────────┘
```

**Document ingestion flow:** Upload → Parse (PDF/TXT/MD) → Chunk (1000 tokens, 200 overlap) → Embed (Sentence Transformers) → Store (ChromaDB)

**Query flow:** User query → Embed query → Similarity search (top-k chunks) → Build context → Claude generates answer → Return answer + source citations

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | React + TypeScript | 18.3 / 5.5 |
| | Vite | 5.4 |
| | Tailwind CSS | 3.4 |
| **Backend** | FastAPI + Python | 0.115 / 3.11 |
| | Uvicorn (ASGI) | 0.32 |
| **LLM** | Claude (Anthropic) | claude-sonnet-4-6 |
| **Embeddings** | Sentence Transformers | all-MiniLM-L6-v2 |
| **Vector DB** | ChromaDB | 0.6 |
| **RAG Framework** | LangChain | 0.3 |
| **Document Parsing** | PyPDF + TextLoader | 4.0 |
| **Containerization** | Docker + Compose | — |
| **Web Server** | Nginx | 1.27 |

---

## Features

- **Document management** — Upload PDF, TXT, and Markdown files via drag-and-drop. Documents are chunked, embedded, and indexed automatically.
- **Context-grounded answers** — Claude answers strictly from your uploaded documents, with no hallucinated facts.
- **Source citations** — Every answer links back to the specific document chunks used for retrieval.
- **Streaming responses** — Real-time token streaming for a responsive chat experience.
- **Persistent vector store** — ChromaDB persists embeddings across restarts; documents survive server reboots.
- **Delete documents** — Remove a document and all its associated vector chunks in one click.
- **Production-ready** — Multi-stage Docker builds, health checks, async I/O throughout, configurable via environment variables.

---

## Prerequisites

- **Docker & Docker Compose** (recommended), or
- **Python 3.11+** and **Node.js 20+** for local development
- An **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com)

---

## Running Locally

### Option 1 — Docker (recommended)

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd rag-pipeline

# 2. Create your environment file
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# 3. Build and start
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

### Option 2 — Manual (development)

**Backend**

```bash
# From project root
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev
# Vite dev server at http://localhost:5173
# Proxies /api/* requests to http://localhost:8000
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(required)* | Your Anthropic API key |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Claude model to use |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence Transformer model |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | ChromaDB storage directory |
| `CHROMA_COLLECTION_NAME` | `rag_documents` | ChromaDB collection name |
| `UPLOAD_DIR` | `./uploads` | Uploaded files directory |
| `CHUNK_SIZE` | `1000` | Characters per document chunk |
| `CHUNK_OVERLAP` | `200` | Overlap between adjacent chunks |
| `RETRIEVAL_K` | `4` | Number of chunks retrieved per query |
| `MAX_UPLOAD_SIZE_MB` | `50` | Maximum upload file size |

---

## API Endpoints

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health, loaded model names |

**Response:**
```json
{
  "status": "healthy",
  "model": "claude-sonnet-4-6",
  "embedding_model": "all-MiniLM-L6-v2",
  "vector_store": "chroma"
}
```

---

### Documents

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload and index a document |
| `GET` | `/api/documents/` | List all indexed documents |
| `DELETE` | `/api/documents/{document_id}` | Delete a document and its chunks |

**Upload a document**
```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@report.pdf"
```
```json
{
  "id": "abc123",
  "filename": "report.pdf",
  "file_type": "pdf",
  "chunk_count": 42,
  "uploaded_at": "2026-03-12T10:00:00Z",
  "size_bytes": 204800
}
```

**List documents**
```bash
curl http://localhost:8000/api/documents/
```
```json
{
  "documents": [...],
  "total": 3
}
```

**Delete a document**
```bash
curl -X DELETE http://localhost:8000/api/documents/abc123
```
```json
{
  "message": "Document deleted",
  "chunks_removed": 42
}
```

---

### Query

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/query` | Query the RAG pipeline |

**Request body:**
```json
{
  "query": "What are the key findings in the report?",
  "num_results": 4,
  "stream": false
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `query` | string | *(required)* | The question to answer |
| `num_results` | integer | `4` | Number of chunks to retrieve (1–10) |
| `stream` | boolean | `false` | Enable token-by-token streaming |

**Non-streaming response:**
```json
{
  "answer": "The key findings are ...",
  "sources": [
    {
      "document_id": "abc123",
      "filename": "report.pdf",
      "chunk_index": 7,
      "content": "...relevant excerpt..."
    }
  ]
}
```

**Streaming response** (`"stream": true`) — returns `text/plain` with tokens streamed incrementally.

```bash
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Summarize the document", "stream": true}'
```

---

## Project Structure

```
rag-pipeline/
├── backend/
│   ├── main.py                  # FastAPI app, startup hooks, CORS
│   ├── config.py                # Pydantic settings (loaded from .env)
│   ├── models.py                # Request/response Pydantic schemas
│   ├── routers/
│   │   ├── documents.py         # Upload, list, delete endpoints
│   │   └── query.py             # RAG query + streaming endpoint
│   └── services/
│       ├── document_processor.py  # Chunk, embed, and store documents
│       ├── embeddings.py          # Singleton HuggingFace embeddings
│       ├── vector_store.py        # ChromaDB CRUD operations
│       └── rag_chain.py           # Retrieval + Claude generation
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Root component
│   │   ├── api/client.ts        # Typed API client
│   │   ├── components/
│   │   │   ├── DocumentPanel.tsx  # Sidebar: upload & document list
│   │   │   ├── ChatPanel.tsx      # Chat interface
│   │   │   └── SourceCard.tsx     # Source citation display
│   │   └── types/index.ts       # TypeScript interfaces
│   ├── Dockerfile               # Multi-stage: Node build → Nginx serve
│   ├── nginx.conf               # Nginx config for SPA routing
│   └── vite.config.ts           # Dev server + /api proxy config
├── Dockerfile.backend           # Python 3.11 backend image
├── docker-compose.yml           # Orchestrates backend + frontend
├── requirements.txt             # Python dependencies
└── .env.example                 # Environment variable template
```

---

## Supported File Types

| Format | Extension | Parser |
|---|---|---|
| PDF | `.pdf` | PyPDF |
| Plain text | `.txt` | TextLoader |
| Markdown | `.md` | TextLoader |

Maximum file size: **50 MB** (configurable via `MAX_UPLOAD_SIZE_MB`).

---

## License

MIT
