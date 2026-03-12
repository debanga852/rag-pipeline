export interface DocumentInfo {
  id: string;
  filename: string;
  file_type: string;
  chunk_count: number;
  uploaded_at: string;
  size_bytes: number;
}

export interface Source {
  document_id: string;
  filename: string;
  chunk_index: number;
  content: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  isLoading?: boolean;
}
