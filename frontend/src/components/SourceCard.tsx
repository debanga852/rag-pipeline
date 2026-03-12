import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import type { Source } from '../types'

interface Props {
  sources: Source[]
}

export default function SourceCard({ sources }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!sources.length) return null

  return (
    <div className="mt-3 rounded-lg border border-gray-200 overflow-hidden text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600"
      >
        <span className="font-medium">
          {sources.length} source{sources.length > 1 ? 's' : ''}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="divide-y divide-gray-100">
          {sources.map((src, i) => (
            <div key={i} className="px-3 py-2 bg-white">
              <div className="flex items-center gap-1.5 mb-1">
                <FileText size={12} className="text-indigo-500 shrink-0" />
                <span className="font-medium text-gray-700 truncate">{src.filename}</span>
                <span className="text-gray-400 shrink-0">· chunk {src.chunk_index}</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{src.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
