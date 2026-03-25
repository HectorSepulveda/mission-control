'use client'

import { useState } from 'react'

interface RouteResult {
  task_id: string
  classification: string
  assigned_to: string
  team: string
  pipeline: string[]
  title: string
  reason: string
  tokens_used: number
}

const TEAM_COLORS: Record<string, string> = {
  dev: '#8b5cf6',
  marketing: '#f43f5e',
  strategy: '#3b82f6',
  core: '#22c55e',
}

const TEAM_LABELS: Record<string, string> = {
  dev: '💻 Desarrollo',
  marketing: '📣 Marketing',
  strategy: '📋 Estrategia',
  core: '⭐ Astro directo',
}

export default function NewTaskModal({ project = 'general', onCreated }: { project?: string; onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RouteResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!instruction.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/tasks/route-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: instruction.trim(), project })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al rutear la tarea')
      } else {
        setResult(data)
        onCreated?.()
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setInstruction('')
    setResult(null)
    setError(null)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        style={{
          background: 'linear-gradient(135deg, #1A6B3C, #22c55e)',
          color: 'white',
          boxShadow: '0 0 12px rgba(26,107,60,0.4)',
        }}
      >
        <span className="text-base">+</span>
        Nueva tarea
      </button>

      {/* Modal backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
              <div>
                <h2 className="text-base font-bold text-white">⭐ Nueva tarea para Astro</h2>
                <p className="text-xs text-gray-500 mt-0.5">Astro clasificará y asignará al equipo correcto automáticamente</p>
              </div>
              <button onClick={handleClose} className="text-gray-600 hover:text-gray-400 text-xl leading-none">×</button>
            </div>

            {/* Body */}
            <div className="p-5">
              {!result ? (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Instrucción — describe la tarea en lenguaje natural
                    </label>
                    <textarea
                      value={instruction}
                      onChange={e => setInstruction(e.target.value)}
                      placeholder="Ej: Crea 3 posts de Instagram para GPS de mascotas con imágenes&#10;Ej: Arregla el bug del formulario de checkout&#10;Ej: Investiga los competidores de PetTech en Chile"
                      rows={4}
                      className="w-full rounded-lg px-3 py-2.5 text-sm text-white resize-none focus:outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        caretColor: '#22c55e',
                      }}
                      autoFocus
                    />
                    <p className="text-[10px] text-gray-600 mt-1.5">
                      💡 Astro usará Haiku (~$0.001) para clasificar y asignar al equipo correcto
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 px-3 py-2 rounded-lg text-xs text-red-400 bg-red-500/10 border border-red-500/20">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center gap-3 justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !instruction.trim()}
                      className="px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                      style={{
                        background: loading ? 'rgba(26,107,60,0.4)' : 'linear-gradient(135deg, #1A6B3C, #22c55e)',
                        color: 'white',
                      }}
                    >
                      {loading ? '⭐ Analizando...' : '⭐ Enviar a Astro'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Resultado del routing */
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="text-sm font-semibold text-white">Tarea creada y asignada</p>
                      <p className="text-xs text-gray-500">Astro usó {result.tokens_used} tokens (${(result.tokens_used * 0.000001).toFixed(5)})</p>
                    </div>
                  </div>

                  {/* Task card */}
                  <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm font-medium text-white mb-2">"{result.title}"</p>

                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <span className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{
                          background: `${TEAM_COLORS[result.team] || '#64748b'}20`,
                          color: TEAM_COLORS[result.team] || '#64748b',
                          border: `1px solid ${TEAM_COLORS[result.team] || '#64748b'}40`,
                        }}>
                        {TEAM_LABELS[result.team] || result.team}
                      </span>
                      <span className="text-xs text-gray-500">→ asignada a <span className="text-white font-medium">{result.assigned_to}</span></span>
                    </div>

                    {/* Pipeline */}
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-600 mb-1.5">Pipeline de ejecución:</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {result.pipeline.map((step, i) => (
                          <div key={step} className="flex items-center gap-1">
                            <span className="text-[10px] px-2 py-0.5 rounded font-medium"
                              style={{
                                background: i === 0 ? 'rgba(230,126,34,0.15)' : 'rgba(255,255,255,0.05)',
                                color: i === 0 ? '#fb923c' : '#94a3b8',
                                border: `1px solid ${i === 0 ? 'rgba(230,126,34,0.3)' : 'rgba(255,255,255,0.08)'}`,
                              }}>
                              {step}
                            </span>
                            {i < result.pipeline.length - 1 && (
                              <span className="text-[10px] text-gray-700">→</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-600">
                      💡 {result.reason}
                    </p>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => { setResult(null); setInstruction('') }}
                      className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      + Otra tarea
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-5 py-2 rounded-lg text-sm font-semibold"
                      style={{ background: 'rgba(26,107,60,0.3)', color: '#22c55e', border: '1px solid rgba(26,107,60,0.4)' }}
                    >
                      Ver en Kanban →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
