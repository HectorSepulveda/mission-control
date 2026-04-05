'use client'

import { useState, useEffect, useCallback } from 'react'

interface AgentInfo {
  agent_id: string
  agent_name: string | null
  status: string
  current_step: string | null
  task_title: string | null
  project: string | null
  tokens_this_task: number
  updated_at: string
  started_at: string
}

interface LlmInfo {
  active_provider: string | null
  active_model: string | null
  updated_at: string | null
}

interface OpenClawStatusData {
  agent: AgentInfo | null
  llm: LlmInfo | null
  error?: string
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'nunca'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

function statusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active': return '#4ade80'
    case 'working': return '#fb923c'
    case 'idle': return '#60a5fa'
    default: return '#64748b'
  }
}

function statusLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active': return 'Activo'
    case 'working': return 'Trabajando'
    case 'idle': return 'Esperando'
    default: return status ?? 'Desconocido'
  }
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
  gemini: 'Gemini',
  ollama: 'Ollama',
}

export default function OpenClawStatusWidget() {
  const [data, setData] = useState<OpenClawStatusData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw-status', { cache: 'no-store' })
      const json = await res.json() as OpenClawStatusData
      setData(json)
    } catch {
      setData({ agent: null, llm: null, error: 'Error de conexión' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
    const interval = setInterval(() => { void fetchStatus() }, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  if (loading) {
    return (
      <div className="card animate-fade-up">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">⭐</span>
          <h2 className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Astro / OpenClaw</h2>
        </div>
        <div className="flex items-center justify-center py-6" style={{ color: '#475569' }}>
          <span className="text-xs">Cargando...</span>
        </div>
      </div>
    )
  }

  const agent = data?.agent ?? null
  const llm = data?.llm ?? null
  const agentStatus = agent?.status ?? 'offline'
  const dotColor = agent ? statusColor(agentStatus) : '#64748b'
  const isOnline = !!agent

  return (
    <div className="card animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">⭐</span>
          <h2 className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Astro / OpenClaw</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'dot-pulse' : ''}`}
            style={{ background: dotColor }}
          />
          <span className="text-[10px] font-medium" style={{ color: dotColor }}>
            {isOnline ? statusLabel(agentStatus) : 'Offline'}
          </span>
        </div>
      </div>

      {data?.error ? (
        <p className="text-xs" style={{ color: '#f87171' }}>{data.error}</p>
      ) : (
        <div className="space-y-3">
          {agent ? (
            <>
              {agent.task_title && (
                <div
                  className="px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-[10px] uppercase tracking-wide font-medium mb-0.5" style={{ color: '#64748b' }}>Tarea actual</p>
                  <p className="text-xs font-semibold truncate" style={{ color: '#e2e8f0' }}>{agent.task_title}</p>
                  {agent.current_step && (
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: '#94a3b8' }}>{agent.current_step}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div
                  className="px-2.5 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.025)' }}
                >
                  <p className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: '#475569' }}>Proyecto</p>
                  <p className="text-[11px] font-semibold truncate" style={{ color: '#cbd5e1' }}>{agent.project ?? '—'}</p>
                </div>
                <div
                  className="px-2.5 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.025)' }}
                >
                  <p className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: '#475569' }}>Tokens tarea</p>
                  <p className="text-[11px] font-semibold" style={{ color: '#fb923c' }}>
                    {agent.tokens_this_task.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>

              <p className="text-[10px]" style={{ color: '#475569' }}>
                Última actividad {timeAgo(agent.updated_at)}
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6" style={{ color: '#475569' }}>
              <p className="text-xs">Sin actividad reciente de Astro</p>
            </div>
          )}

          {llm && (
            <div
              className="flex items-center justify-between px-3 py-2 rounded-xl"
              style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}
            >
              <div>
                <p className="text-[9px] uppercase tracking-wide font-medium" style={{ color: '#64748b' }}>LLM activo</p>
                <p className="text-xs font-semibold" style={{ color: '#60a5fa' }}>
                  {llm.active_provider ? (PROVIDER_LABELS[llm.active_provider] ?? llm.active_provider) : '—'}
                </p>
              </div>
              <p className="text-[10px]" style={{ color: '#475569' }}>{llm.active_model ?? '—'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
