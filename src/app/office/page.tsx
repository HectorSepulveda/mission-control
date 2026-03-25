'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/* ── Types ─────────────────────────────────────────────── */
interface AgentMessage {
  id: number
  from_agent: string
  to_agent: string
  message_type: string
  content: string
  status?: string
  created_at: string
}

interface AgentActivity {
  id: string
  agent_id: string
  agent_name: string | null
  project: string
  task_title: string | null
  current_step: string | null
  status: string
  tokens_this_task: number
  started_at: string
  updated_at: string
}

interface AgentDef {
  key: string
  name: string
  emoji: string
  gradient: string
}

/* ── Constants ──────────────────────────────────────────── */
const AGENTS: AgentDef[] = [
  { key: 'astro', name: 'Astro', emoji: '⭐', gradient: 'linear-gradient(135deg, #1A6B3C, #22c55e)' },
  { key: 'cto', name: 'CTO', emoji: '🧠', gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)' },
  { key: 'dev', name: 'Dev', emoji: '💻', gradient: 'linear-gradient(135deg, #5b21b6, #8b5cf6)' },
  { key: 'pm', name: 'PM', emoji: '📋', gradient: 'linear-gradient(135deg, #92400e, #f59e0b)' },
  { key: 'research', name: 'Research', emoji: '🔍', gradient: 'linear-gradient(135deg, #0e7490, #06b6d4)' },
  { key: 'marketing', name: 'Marketing', emoji: '📣', gradient: 'linear-gradient(135deg, #9f1239, #f43f5e)' },
  { key: 'qa', name: 'QA', emoji: '🧪', gradient: 'linear-gradient(135deg, #065f46, #10b981)' },
  { key: 'devops', name: 'DevOps', emoji: '🚀', gradient: 'linear-gradient(135deg, #1e3a5f, #0ea5e9)' },
  { key: 'pixel', name: 'Pixel', emoji: '🎨', gradient: 'linear-gradient(135deg, #701a75, #d946ef)' },
]

/* ── Helpers ────────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function matchAgent(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('astro')) return 'astro'
  if (n.includes('cto') || n.includes('chief')) return 'cto'
  if (n.includes('dev') && !n.includes('devops') && !n.includes('ops')) return 'dev'
  if (n.includes('pm') || n.includes('product') || n.includes('manager')) return 'pm'
  if (n.includes('research') || n.includes('resrch')) return 'research'
  if (n.includes('market') || n.includes('mktg')) return 'marketing'
  if (n.includes('qa') || n.includes('quality')) return 'qa'
  if (n.includes('devops') || n.includes('ops')) return 'devops'
  if (n.includes('pixel') || n.includes('design')) return 'pixel'
  return ''
}

function msgTypeColor(type: string): { bg: string; color: string } {
  switch (type?.toLowerCase()) {
    case 'handoff': return { bg: 'rgba(230,126,34,0.15)', color: '#E67E22' }
    case 'result': return { bg: 'rgba(26,107,60,0.15)', color: '#22c55e' }
    case 'error': return { bg: 'rgba(239,68,68,0.15)', color: '#f87171' }
    case 'request': return { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
    default: return { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' }
  }
}

/* ── Connection Line ────────────────────────────────────── */
interface ConnectionLine {
  from: string
  to: string
  type: string
}

function AgentLines({
  lines,
  cardRefs,
}: {
  lines: ConnectionLine[]
  cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
}) {
  const [lineData, setLineData] = useState<
    { key: string; top: number; left: number; width: number; angle: number; type: string }[]
  >([])

  useEffect(() => {
    const computeLines = () => {
      const container = document.getElementById('office-grid-container')
      if (!container) return
      const containerRect = container.getBoundingClientRect()
      const result: typeof lineData = []

      for (const line of lines) {
        const fromEl = cardRefs.current[line.from]
        const toEl = cardRefs.current[line.to]
        if (!fromEl || !toEl) continue

        const fromRect = fromEl.getBoundingClientRect()
        const toRect = toEl.getBoundingClientRect()

        const x1 = fromRect.left + fromRect.width / 2 - containerRect.left
        const y1 = fromRect.top + fromRect.height / 2 - containerRect.top
        const x2 = toRect.left + toRect.width / 2 - containerRect.left
        const y2 = toRect.top + toRect.height / 2 - containerRect.top

        const dx = x2 - x1
        const dy = y2 - y1
        const width = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)

        result.push({
          key: `${line.from}-${line.to}`,
          top: y1,
          left: x1,
          width,
          angle,
          type: line.type,
        })
      }
      setLineData(result)
    }

    computeLines()
    window.addEventListener('resize', computeLines)
    return () => window.removeEventListener('resize', computeLines)
  }, [lines, cardRefs])

  return (
    <>
      {lineData.map((l) => {
        const isHandoff = l.type === 'handoff'
        const isError = l.type === 'error'
        const color = isError ? '#ef4444' : isHandoff ? '#E67E22' : '#22c55e'
        return (
          <div
            key={l.key}
            style={{
              position: 'absolute',
              top: l.top,
              left: l.left,
              width: l.width,
              height: 2,
              transformOrigin: '0 50%',
              transform: `rotate(${l.angle}deg)`,
              pointerEvents: 'none',
              zIndex: 1,
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              backgroundSize: '200% 100%',
              animation: 'flowLine 1.5s linear infinite',
              opacity: 0.8,
            }}
          />
        )
      })}
    </>
  )
}

/* ── Agent Card ─────────────────────────────────────────── */
function AgentCard({
  agent,
  activity,
  hasActiveMsg,
  cardRef,
}: {
  agent: AgentDef
  activity: AgentActivity | undefined
  hasActiveMsg: boolean
  cardRef: (el: HTMLDivElement | null) => void
}) {
  const isActive = activity?.status === 'active' || activity?.status === 'working'
  const isWorking = activity?.status === 'working'

  const statusLabel = isWorking ? 'working' : isActive ? 'active' : 'idle'
  const statusColor = isWorking ? '#fb923c' : isActive ? '#4ade80' : '#64748b'
  const statusBg = isWorking ? 'rgba(251,146,60,0.12)' : isActive ? 'rgba(74,222,128,0.12)' : 'rgba(100,116,139,0.08)'

  return (
    <div
      ref={cardRef}
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.03)',
        border: hasActiveMsg
          ? '1px solid rgba(230,126,34,0.6)'
          : isActive
          ? `1px solid ${statusColor}30`
          : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'border-color 0.3s, box-shadow 0.3s',
        boxShadow: hasActiveMsg
          ? '0 0 16px rgba(230,126,34,0.25)'
          : isActive
          ? `0 0 12px ${statusColor}15`
          : 'none',
        zIndex: 2,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: agent.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 30,
          flexShrink: 0,
          position: 'relative',
          animation: isActive ? 'activePulse 2s ease-in-out infinite' : 'none',
        }}
      >
        {agent.emoji}
        {/* Status dot */}
        <span
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: statusColor,
            border: '2px solid #060608',
          }}
        />
      </div>

      {/* Name */}
      <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, textAlign: 'center', lineHeight: 1.2 }}>
        {agent.name}
      </p>

      {/* Status badge */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          padding: '2px 8px',
          borderRadius: 99,
          color: statusColor,
          background: statusBg,
          border: `1px solid ${statusColor}30`,
        }}
      >
        {statusLabel}
      </span>

      {/* Task info */}
      {activity?.task_title && isActive && (
        <p
          style={{
            fontSize: 10,
            color: '#94a3b8',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            lineHeight: 1.4,
          }}
        >
          {activity.task_title}
        </p>
      )}
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────── */
export default function OfficePage() {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const feedRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/activity')
      if (res.ok) {
        const data = await res.json()
        setActivities(data)
      }
    } catch { /* ignore */ }
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
        setLoading(false)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchActivity()
    fetchMessages()

    const activityInterval = setInterval(fetchActivity, 10000)
    const msgInterval = setInterval(() => {
      fetchMessages()
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight
      }
    }, 3000)

    return () => {
      clearInterval(activityInterval)
      clearInterval(msgInterval)
    }
  }, [fetchActivity, fetchMessages])

  // Auto-scroll on new messages
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [messages])

  const activeAgentKeys = new Set(
    activities
      .filter(a => a.status === 'active' || a.status === 'working')
      .map(a => matchAgent(a.agent_name || a.agent_id))
      .filter(Boolean)
  )

  const activeCount = activeAgentKeys.size

  // Active connections from pending/read messages
  const activeConnections: ConnectionLine[] = messages
    .filter(m => m.status === 'pending' || m.status === 'read')
    .slice(0, 5)
    .map(m => ({
      from: matchAgent(m.from_agent),
      to: matchAgent(m.to_agent),
      type: m.message_type,
    }))
    .filter(l => l.from && l.to && l.from !== l.to)

  // Set of agent keys with active messages
  const agentsWithMsg = new Set(activeConnections.flatMap(l => [l.from, l.to]))

  const getActivity = (agentKey: string) => {
    return activities.find(a => {
      const k = matchAgent(a.agent_name || a.agent_id)
      return k === agentKey
    })
  }

  const recentMessages = [...messages].slice(0, 10).reverse()

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes flowLine {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes activePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #22c55e, #34d399 50%, #fb923c)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            🏢 The Office
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            Centro de operaciones de agentes en tiempo real
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderRadius: 12,
          background: activeCount > 0 ? 'rgba(74,222,128,0.08)' : 'rgba(100,116,139,0.08)',
          border: `1px solid ${activeCount > 0 ? 'rgba(74,222,128,0.25)' : 'rgba(100,116,139,0.2)'}`,
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: activeCount > 0 ? '#4ade80' : '#64748b',
            display: 'inline-block',
            animation: activeCount > 0 ? 'activePulse 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: activeCount > 0 ? '#4ade80' : '#64748b' }}>
            {activeCount} agente{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Grid de agentes */}
      <div
        id="office-grid-container"
        style={{ position: 'relative', marginBottom: 32 }}
      >
        {/* Connection lines layer */}
        <AgentLines lines={activeConnections} cardRefs={cardRefs} />

        {/* Agent cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}>
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.key}
              agent={agent}
              activity={getActivity(agent.key)}
              hasActiveMsg={agentsWithMsg.has(agent.key)}
              cardRef={(el) => { cardRefs.current[agent.key] = el }}
            />
          ))}
        </div>
      </div>

      {/* Message feed */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>
            💬 Mensajes en Tiempo Real
          </h2>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 99,
            background: 'rgba(96,165,250,0.1)',
            color: '#60a5fa',
            border: '1px solid rgba(96,165,250,0.2)',
          }}>
            live
          </span>
        </div>

        <div
          ref={feedRef}
          style={{ maxHeight: 320, overflowY: 'auto', padding: 8 }}
        >
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#475569', fontSize: 13 }}>
              Cargando mensajes...
            </div>
          ) : recentMessages.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#475569' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <p style={{ fontSize: 13 }}>Sin mensajes entre agentes</p>
            </div>
          ) : (
            recentMessages.map((msg) => {
              const { bg, color } = msgTypeColor(msg.message_type)
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 10,
                    marginBottom: 4,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
                        {msg.from_agent}
                      </span>
                      <span style={{ fontSize: 11, color: '#475569' }}>→</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
                        {msg.to_agent}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 99,
                        background: bg,
                        color,
                        border: `1px solid ${color}30`,
                      }}>
                        {msg.message_type}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 11,
                      color: '#64748b',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {msg.content}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, color: '#334155', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {timeAgo(msg.created_at)}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
