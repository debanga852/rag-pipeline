from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str
    groq_model: str = "llama-3.3-70b-versatile"
    embedding_model: str = "all-MiniLM-L6-v2"
    chroma_persist_dir: str = "./chroma_db"
    chroma_collection_name: str = "rag_documents"
    upload_dir: str = "./uploads"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_k: int = 4
    max_upload_size_mb: int = 50

    model_config = {"env_file": ".env"}


settings = Settings()
