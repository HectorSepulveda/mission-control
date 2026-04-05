'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface AgentMessage {
  id: number
  from_agent: string
  to_agent: string | null
  message_type: string | null
  content: string | null
  status: string | null
  created_at: string
  updated_at: string | null
}

interface Props {
  messages: AgentMessage[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export default function ApprovalsClient({ messages: initialMessages }: Props) {
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages)
  const [actioningId, setActioningId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    setActioningId(id)
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id))
        startTransition(() => { router.refresh() })
      }
    } finally {
      setActioningId(null)
    }
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20" style={{ color: '#475569' }}>
        <div className="text-5xl mb-4">✅</div>
        <p className="text-sm font-medium" style={{ color: '#64748b' }}>Sin aprobaciones pendientes</p>
        <p className="text-xs mt-1" style={{ color: '#334155' }}>El publisher agent no tiene mensajes en espera</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        let parsedContent: Record<string, unknown> | null = null
        if (msg.content) {
          try {
            parsedContent = JSON.parse(msg.content) as Record<string, unknown>
          } catch {
            // leave as string
          }
        }

        const isActioning = actioningId === msg.id && isPending

        return (
          <div
            key={msg.id}
            className="card"
            style={{ borderColor: 'rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.04)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.12)' }}
                  >
                    {msg.message_type ?? 'mensaje'}
                  </span>
                  <span className="text-[10px]" style={{ color: '#475569' }}>
                    {timeAgo(msg.created_at)}
                  </span>
                </div>

                {parsedContent ? (
                  <div className="space-y-1">
                    {Object.entries(parsedContent).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-[11px] font-medium flex-shrink-0" style={{ color: '#94a3b8' }}>{k}:</span>
                        <span className="text-[11px] break-words" style={{ color: '#cbd5e1' }}>
                          {typeof v === 'string' ? v : JSON.stringify(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs whitespace-pre-wrap break-words" style={{ color: '#cbd5e1' }}>
                    {msg.content ?? '(sin contenido)'}
                  </p>
                )}

                {msg.to_agent && (
                  <p className="text-[10px] mt-2" style={{ color: '#475569' }}>
                    Para: {msg.to_agent}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => { void handleAction(msg.id, 'approve') }}
                  disabled={actioningId !== null}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: isActioning ? 'rgba(74,222,128,0.1)' : 'rgba(74,222,128,0.15)',
                    border: '1px solid rgba(74,222,128,0.3)',
                    color: '#4ade80',
                    opacity: actioningId !== null && !isActioning ? 0.5 : 1,
                    cursor: actioningId !== null ? 'not-allowed' : 'pointer',
                  }}
                >
                  ✓ Aprobar
                </button>
                <button
                  onClick={() => { void handleAction(msg.id, 'reject') }}
                  disabled={actioningId !== null}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: isActioning ? 'rgba(248,113,113,0.1)' : 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.25)',
                    color: '#f87171',
                    opacity: actioningId !== null && !isActioning ? 0.5 : 1,
                    cursor: actioningId !== null ? 'not-allowed' : 'pointer',
                  }}
                >
                  ✗ Rechazar
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
