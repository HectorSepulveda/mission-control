'use client'

import { useEffect, useRef, useState } from 'react'

interface Agent { id: string; name: string; role: string; model: string; status: string }
interface Activity { agent_id: string; status: string; task_title: string | null; current_step: string | null; tokens_this_task: number; updated_at: string }
interface Message { id: string; from_agent: string; to_agent: string; message_type: string; content: string; status: string; created_at: string }

const AGENT_DEFS: Record<string, { emoji: string; gradient: string }> = {
  astro:     { emoji: '⭐', gradient: 'linear-gradient(135deg,#1A6B3C,#22c55e)' },
  cto:       { emoji: '🧠', gradient: 'linear-gradient(135deg,#1e40af,#3b82f6)' },
  dev:       { emoji: '💻', gradient: 'linear-gradient(135deg,#5b21b6,#8b5cf6)' },
  pm:        { emoji: '📋', gradient: 'linear-gradient(135deg,#92400e,#f59e0b)' },
  research:  { emoji: '🔍', gradient: 'linear-gradient(135deg,#0e7490,#06b6d4)' },
  marketing: { emoji: '📣', gradient: 'linear-gradient(135deg,#9f1239,#f43f5e)' },
  qa:        { emoji: '🧪', gradient: 'linear-gradient(135deg,#065f46,#10b981)' },
  devops:    { emoji: '🚀', gradient: 'linear-gradient(135deg,#1e3a5f,#0ea5e9)' },
  pixel:     { emoji: '🎨', gradient: 'linear-gradient(135deg,#701a75,#d946ef)' },
}

function agentKey(name: string): string {
  return name.toLowerCase().replace(' agent','').replace(' ','-').replace('image generator','pixel')
}

function msgTypeColor(type: string): string {
  return { handoff:'#fb923c', result:'#4ade80', error:'#f87171', question:'#60a5fa', escalation:'#f97316' }[type] || '#94a3b8'
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff/60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  return `${Math.floor(m/60)}h`
}

export default function OfficeClient({
  agents: initialAgents,
  activity: initialActivity,
  messages: initialMessages,
}: {
  agents: Agent[]
  activity: Activity[]
  messages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [activity, setActivity] = useState<Activity[]>(initialActivity)
  const feedRef = useRef<HTMLDivElement>(null)

  // Poll messages & activity every 4s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [msgRes, actRes] = await Promise.all([
          fetch('/api/messages'),
          fetch('/api/activity'),
        ])
        if (msgRes.ok) setMessages(await msgRes.json())
        if (actRes.ok) setActivity(await actRes.json())
      } catch {}
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [messages])

  // Build activity map
  const activityMap = activity.reduce((m, a) => { m[a.agent_id] = a; return m }, {} as Record<string, Activity>)

  // Active message pairs
  const activeMsgs = messages.filter(m => m.status === 'pending' || m.status === 'read')

  const activeCount = Object.values(activityMap).filter(a => a.status === 'active' || a.status === 'working').length

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🏢 The Office</h1>
          <p className="text-sm text-gray-500 mt-1">{initialAgents.length} agentes · {activeCount} activos ahora</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-500/20 bg-green-500/8 text-green-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          En vivo
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {initialAgents.map(agent => {
          const key = agentKey(agent.name)
          const def = AGENT_DEFS[key] || { emoji: '🤖', gradient: 'linear-gradient(135deg,#1A6B3C,#22c55e)' }
          const act = activityMap[key]
          const isActive = act?.status === 'active'
          const isWorking = act?.status === 'working'
          const hasMsg = activeMsgs.some(m => m.from_agent === key || m.to_agent === key)

          return (
            <div
              key={agent.id}
              className="relative rounded-xl p-4 transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: hasMsg
                  ? '1px solid rgba(230,126,34,0.5)'
                  : isActive
                  ? '1px solid rgba(74,222,128,0.3)'
                  : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isActive ? '0 0 20px rgba(74,222,128,0.1)' : hasMsg ? '0 0 20px rgba(230,126,34,0.1)' : 'none',
              }}
            >
              {/* Avatar */}
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{
                    background: def.gradient,
                    boxShadow: isActive ? '0 0 0 0 rgba(74,222,128,0.4)' : 'none',
                    animation: isActive ? 'activePulse 2s ease-in-out infinite' : 'none',
                  }}
                >
                  {def.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate">{agent.name}</p>
                  <p className="text-[10px] text-gray-600 truncate">{agent.role}</p>
                </div>
              </div>

              {/* Status */}
              <div className="mt-3">
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    color: isActive ? '#4ade80' : isWorking ? '#fb923c' : '#64748b',
                    background: isActive ? 'rgba(74,222,128,0.1)' : isWorking ? 'rgba(251,146,60,0.1)' : 'rgba(100,116,139,0.08)',
                    border: `1px solid ${isActive ? 'rgba(74,222,128,0.25)' : isWorking ? 'rgba(251,146,60,0.25)' : 'rgba(100,116,139,0.2)'}`,
                    animation: isWorking ? 'workingShimmer 1.5s ease-in-out infinite' : 'none',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: isActive ? '#4ade80' : isWorking ? '#fb923c' : '#475569' }}
                  />
                  {isActive ? 'Activo' : isWorking ? 'Trabajando' : 'En espera'}
                </span>

                {act?.task_title && (
                  <p className="text-[10px] text-gray-500 mt-1 truncate" title={act.task_title}>
                    {act.current_step || act.task_title}
                  </p>
                )}
              </div>

              {/* Message indicator */}
              {hasMsg && (
                <div
                  className="absolute top-2 right-2 w-2 h-2 rounded-full"
                  style={{ background: '#fb923c', animation: 'activePulse 1s ease-in-out infinite' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Active connections */}
      {activeMsgs.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">⚡ Conexiones activas</h2>
          <div className="flex flex-wrap gap-2">
            {activeMsgs.slice(0, 5).map(m => (
              <div
                key={m.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                style={{
                  background: 'rgba(230,126,34,0.1)',
                  border: '1px solid rgba(230,126,34,0.3)',
                  color: '#fb923c',
                  animation: 'flowPulse 2s ease-in-out infinite',
                }}
              >
                <span>{AGENT_DEFS[m.from_agent]?.emoji || '🤖'} {m.from_agent}</span>
                <span>→</span>
                <span>{AGENT_DEFS[m.to_agent]?.emoji || '🤖'} {m.to_agent}</span>
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                  style={{ color: msgTypeColor(m.message_type), background: `${msgTypeColor(m.message_type)}15` }}
                >
                  {m.message_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message feed */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-3">
          💬 Feed de mensajes
          <span className="ml-2 text-[10px] font-normal text-gray-600">actualiza cada 4s</span>
        </h2>
        <div
          ref={feedRef}
          className="space-y-2 overflow-y-auto"
          style={{ maxHeight: 280 }}
        >
          {messages.length === 0 ? (
            <p className="text-xs text-gray-600 py-4 text-center">Sin mensajes aún. Los agentes comunicarán su actividad aquí.</p>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className="flex items-start gap-3 p-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span className="text-lg flex-shrink-0">{AGENT_DEFS[msg.from_agent]?.emoji || '🤖'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-semibold text-white">{msg.from_agent}</span>
                    <span className="text-[10px] text-gray-600">→</span>
                    <span className="text-xs text-gray-400">{msg.to_agent}</span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{ color: msgTypeColor(msg.message_type), background: `${msgTypeColor(msg.message_type)}15` }}
                    >
                      {msg.message_type}
                    </span>
                    <span className="text-[10px] text-gray-700 ml-auto">{timeAgo(msg.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{msg.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes activePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(74,222,128,0); }
        }
        @keyframes workingShimmer {
          0%,100% { opacity:1; }
          50% { opacity:0.6; }
        }
        @keyframes flowPulse {
          0%,100% { opacity:1; }
          50% { opacity:0.7; }
        }
      `}</style>
    </div>
  )
}
