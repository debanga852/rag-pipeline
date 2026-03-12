import { useRef, useState } from 'react'
import {
  FileText,
  Trash2,
  Upload,
  AlertCircle,
  Loader2,
  BookOpen,
} from 'lucide-react'
import type { DocumentInfo } from '../types'
import { uploadDocument, deleteDocument } from '../api/client'

interface Props {
  documents: DocumentInfo[]
  onRefresh: () => void
  loading: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentPanel({ documents, onRefresh, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    setUploading(true)
    try {
      await Promise.all(Array.from(files).map(uploadDocument))
      onRefresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteDocument(id)
      onRefresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <aside className="w-72 flex flex-col h-screen border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-0.5">
          <BookOpen size={18} className="text-indigo-600" />
          <h1 className="font-semibold text-gray-900">Knowledge Base</h1>
        </div>
        <p className="text-xs text-gray-500">
          {documents.length} document{documents.length !== 1 ? 's' : ''} indexed
        </p>
      </div>

      {/* Upload zone */}
      <div className="p-3">
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-1.5 text-indigo-600">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-xs font-medium">Uploading…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-gray-400">
              <Upload size={20} />
              <span className="text-xs font-medium text-gray-600">
                Click or drag to upload
              </span>
              <span className="text-xs">PDF, TXT, MD</span>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {error && (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded p-2">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {loading && (
          <div className="flex justify-center pt-4">
            <Loader2 size={18} className="animate-spin text-gray-400" />
          </div>
        )}

        {!loading && documents.length === 0 && (
          <p className="text-xs text-gray-400 text-center pt-4">
            No documents yet. Upload files to get started.
          </p>
        )}

        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-gray-50 group"
          >
            <FileText size={16} className="text-indigo-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate" title={doc.filename}>
                {doc.filename}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {doc.chunk_count} chunks · {formatBytes(doc.size_bytes)}
              </p>
            </div>
            <button
              onClick={() => handleDelete(doc.id)}
              disabled={deletingId === doc.id}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all disabled:opacity-50 shrink-0"
              title="Delete document"
            >
              {deletingId === doc.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
