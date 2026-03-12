import { useEffect, useState } from 'react'
import type { DocumentInfo } from './types'
import { listDocuments } from './api/client'
import DocumentPanel from './components/DocumentPanel'
import ChatPanel from './components/ChatPanel'

export default function App() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch {
      // backend may not be ready yet — silently ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <DocumentPanel documents={documents} onRefresh={refresh} loading={loading} />
      <ChatPanel documents={documents} />
    </div>
  )
}
