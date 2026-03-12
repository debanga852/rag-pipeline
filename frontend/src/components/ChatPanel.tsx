import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import type { Message } from '../types'
import type { DocumentInfo } from '../types'
import { queryRAG } from '../api/client'
import SourceCard from './SourceCard'

interface Props {
  documents: DocumentInfo[]
}

const EXAMPLES = [
  'Summarize the main topics covered in my documents.',
  'What are the key findings or conclusions?',
  'Explain the most important concepts mentioned.',
]

let msgCounter = 0
function newId() { return `msg-${++msgCounter}` }

export default function ChatPanel({ documents }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function submit(query: string) {
    const q = query.trim()
    if (!q || loading) return

    const userMsg: Message = { id: newId(), role: 'user', content: q }
    const loadingMsg: Message = { id: newId(), role: 'assistant', content: '', isLoading: true }

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setInput('')
    setLoading(true)

    try {
      const result = await queryRAG(q)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: result.answer, sources: result.sources, isLoading: false }
            : m,
        ),
      )
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? {
                ...m,
                content: `Error: ${(e as Error).message}`,
                isLoading: false,
              }
            : m,
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(input)
    }
  }

  return (
    <main className="flex flex-col flex-1 h-screen bg-gray-50 min-w-0">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-600" />
          <h2 className="font-semibold text-gray-900">RAG Chat</h2>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Powered by Claude · claude-sonnet-4-6
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <Bot size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Ask anything about your documents</p>
              <p className="text-sm text-gray-400">
                {documents.length === 0
                  ? 'Upload documents in the sidebar to get started.'
                  : `${documents.length} document${documents.length > 1 ? 's' : ''} ready to query.`}
              </p>
            </div>
            {documents.length > 0 && (
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => submit(ex)}
                    className="text-sm text-left px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-gray-600 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-indigo-600" />
              </div>
            )}

            <div className={`max-w-2xl ${msg.role === 'user' ? 'order-first' : ''}`}>
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {msg.isLoading ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Thinking…</span>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>

              {msg.role === 'assistant' && !msg.isLoading && msg.sources && (
                <SourceCard sources={msg.sources} />
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 bg-white border-t border-gray-200 shrink-0">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            onClick={() => submit(input)}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-1.5">
          Answers are generated from your uploaded documents only.
        </p>
      </div>
    </main>
  )
}
