import type { DocumentInfo, Source } from '../types'

const API = '/api'

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error((err as { detail?: string }).detail ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

export async function uploadDocument(file: File): Promise<DocumentInfo> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch(`${API}/documents/upload`, { method: 'POST', body })
  return handle<DocumentInfo>(res)
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch(`${API}/documents/`)
  const data = await handle<{ documents: DocumentInfo[] }>(res)
  return data.documents
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API}/documents/${id}`, { method: 'DELETE' })
  await handle<unknown>(res)
}

export interface QueryResult {
  answer: string
  sources: Source[]
  query: string
}

export async function queryRAG(query: string, numResults = 4): Promise<QueryResult> {
  const res = await fetch(`${API}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, num_results: numResults, stream: false }),
  })
  return handle<QueryResult>(res)
}
