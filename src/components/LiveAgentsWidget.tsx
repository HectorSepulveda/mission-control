'use client'

import { useEffect, useState } from 'react'

interface Activity {
  agent_id: string
  agent_name: string | null
  project: string
  task_title: string | null
  current_step: string | null
  status: string
  tokens_this_task: number
  updated_at: string
}

const AGENT_EMOJI: Record<string, string> = {
  astro: '⭐', cto: '🧠', pm: '📋', 'marketing-lead': '📣',
  research: '🔭', strategy: '🎯', 'content-writer': '✍️',
  seo: '🔍', 'social-media': '📱', pixel: '🎨',
  backend: '⚙️', 'qa-func': '🧪', 'email-marketing': '📧',
  'image-generator': '🖼️', publisher: '🔒',
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins}m`
  return `hace ${Math.floor(mins / 60)}h`
}

export default function LiveAgentsWidget() {
  const [activity, setActivity] = useState<Activity[]>([])
  const [lastPoll, setLastPoll] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/activity')
        if (res.ok) {
          setActivity(await res.json())
          setLastPoll(new Date())
        }
      } catch {}
      finally { setLoading(false) }
    }
    fetch_()
    const iv = setInterval(fetch_, 5000)
    return () => clearInterval(iv)
  }, [])

  const working = activity.filter(a => a.status === 'working')
  const active  = activity.filter(a => a.status === 'active')
  const recent  = activity.filter(a => a.status !== 'working' && a.status !== 'active').slice(0, 3)

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white">🤖 Agentes Ahora</h2>
        <div className="flex items-center gap-2">
          {lastPoll && (
            <span className="text-[10px] text-gray-600">
              ↻ {lastPoll.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded-lg font-medium"
            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
            {working.length + active.length} activos
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-600 text-sm">Cargando...</div>
      ) : working.length === 0 && active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-600">
          <div className="text-4xl mb-3">😴</div>
          <p className="text-sm">Sin actividad ahora mismo</p>
        </div>
      ) : (
        <div className="space-y-2">

          {/* TRABAJANDO AHORA — amarillo pulsante */}
          {working.map(a => (
            <div key={a.agent_id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
                  {AGENT_EMOJI[a.agent_id] || '🤖'}
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping opacity-75" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{a.agent_name || a.agent_id}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-yellow-400"
                    style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
                    ⚡ Trabajando
                  </span>
                </div>
                <p className="text-xs text-gray-300 truncate mt-0.5 font-medium">{a.task_title || 'Tarea en proceso'}</p>
                {a.current_step && (
                  <p className="text-[11px] text-yellow-600 truncate">↳ {a.current_step}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-gray-600">{timeAgo(a.updated_at)}</p>
                {a.tokens_this_task > 0 && (
                  <p className="text-[10px] text-gray-700">{formatNumber(a.tokens_this_task)} tok</p>
                )}
              </div>
            </div>
          ))}

          {/* ACTIVOS — verde */}
          {active.map(a => (
            <div key={a.agent_id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                  {AGENT_EMOJI[a.agent_id] || '🤖'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-dark-card" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{a.agent_name || a.agent_id}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full text-green-400"
                    style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    Activo
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {a.task_title || a.current_step || 'Disponible'}
                </p>
              </div>
              <p className="text-[10px] text-gray-600 flex-shrink-0">{timeAgo(a.updated_at)}</p>
            </div>
          ))}

          {/* RECIENTES — gris, últimos 3 */}
          {recent.length > 0 && (
            <>
              <div className="text-[10px] text-gray-700 px-1 pt-1">Última actividad</div>
              {recent.map(a => (
                <div key={a.agent_id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: 'rgba(100,116,139,0.15)' }}>
                    {AGENT_EMOJI[a.agent_id] || '🤖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-400 font-medium">{a.agent_name || a.agent_id}</span>
                    <p className="text-[11px] text-gray-600 truncate">{a.task_title || '—'}</p>
                  </div>
                  <p className="text-[10px] text-gray-700 flex-shrink-0">{timeAgo(a.updated_at)}</p>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
