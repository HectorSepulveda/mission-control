'use client'

import { useState, useEffect, useCallback } from 'react'

interface LlmStatusData {
  active_provider: string | null
  active_model: string | null
  provider_statuses: Record<string, string>
  last_switch_at: string | null
  updated_at: string | null
  error?: string
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'desconocido'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
  gemini: 'Gemini',
  ollama: 'Ollama',
}

const ALL_PROVIDERS = ['anthropic', 'openrouter', 'gemini', 'ollama']

export default function LlmStatusWidget() {
  const [data, setData] = useState<LlmStatusData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/llm-status', { cache: 'no-store' })
      const json = await res.json() as LlmStatusData
      setData(json)
    } catch {
      setData({ active_provider: null, active_model: null, provider_statuses: {}, last_switch_at: null, updated_at: null, error: 'Error de conexión' })
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
          <span className="text-base">🧠</span>
          <h2 className="text-sm font-semibold" style={{ color: '#94a3b8' }}>LLM Router</h2>
        </div>
        <div className="flex items-center justify-center py-6" style={{ color: '#475569' }}>
          <span className="text-xs">Cargando...</span>
        </div>
      </div>
    )
  }

  const activeProvider = data?.active_provider ?? null
  const activeModel = data?.active_model ?? null
  const providerStatuses = data?.provider_statuses ?? {}

  return (
    <div className="card animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🧠</span>
          <h2 className="text-sm font-semibold" style={{ color: '#94a3b8' }}>LLM Router</h2>
        </div>
        {data?.last_switch_at && (
          <span className="text-[10px]" style={{ color: '#475569' }}>
            Cambio {timeAgo(data.last_switch_at)}
          </span>
        )}
      </div>

      {data?.error ? (
        <p className="text-xs" style={{ color: '#f87171' }}>{data.error}</p>
      ) : (
        <div className="space-y-3">
          {/* Active provider + model */}
          <div
            className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: '#64748b' }}>Proveedor activo</p>
              <p className="text-sm font-bold" style={{ color: '#4ade80' }}>
                {activeProvider ? (PROVIDER_LABELS[activeProvider] ?? activeProvider) : 'Sin datos'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: '#64748b' }}>Modelo</p>
              <p className="text-xs font-semibold" style={{ color: '#cbd5e1' }}>
                {activeModel ?? '—'}
              </p>
            </div>
          </div>

          {/* Provider statuses */}
          <div className="grid grid-cols-2 gap-2">
            {ALL_PROVIDERS.map((p) => {
              const status = providerStatuses[p] ?? 'unknown'
              const isActive = p === activeProvider
              const isHealthy = status === 'healthy' || isActive
              const dotColor = isActive ? '#4ade80' : isHealthy ? '#60a5fa' : '#f87171'
              const label = status === 'unknown' ? (isActive ? 'healthy' : 'unknown') : status
              return (
                <div
                  key={p}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: isActive ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'dot-pulse' : ''}`}
                    style={{ background: dotColor }}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate" style={{ color: '#cbd5e1' }}>
                      {PROVIDER_LABELS[p] ?? p}
                    </p>
                    <p className="text-[9px]" style={{ color: dotColor }}>{label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
