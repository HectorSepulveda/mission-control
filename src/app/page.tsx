import { query } from '@/lib/db'

interface SummaryData {
  activeProjects: number
  activeAgents: number
  tokensToday: number
  costUsd: number
}

interface Event {
  id: number
  agent_name: string
  event_type: string
  description: string
  created_at: string
}

async function getSummary(): Promise<SummaryData> {
  try {
    const [proj, agents, tokens] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) as count FROM projects WHERE status = 'active'`),
      query<{ count: string }>(`SELECT COUNT(*) as count FROM agents WHERE status IN ('active', 'working')`),
      query<{ tokens: string; cost: string }>(`
        SELECT COALESCE(SUM(input_tokens + output_tokens), 0) as tokens,
               COALESCE(SUM(cost_usd), 0) as cost
        FROM token_usage
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `),
    ])
    return {
      activeProjects: parseInt(proj[0]?.count || '0'),
      activeAgents: parseInt(agents[0]?.count || '0'),
      tokensToday: parseInt(tokens[0]?.tokens || '0'),
      costUsd: parseFloat(tokens[0]?.cost || '0'),
    }
  } catch {
    return { activeProjects: 0, activeAgents: 0, tokensToday: 0, costUsd: 0 }
  }
}

async function getRecentEvents(): Promise<Event[]> {
  try {
    return await query<Event>(`
      SELECT id, 
             COALESCE(agent_name, 'Sistema') as agent_name,
             COALESCE(event_type, 'info') as event_type,
             COALESCE(description, payload::text) as description,
             created_at
      FROM agent_events
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 20
    `)
  } catch {
    return []
  }
}

async function getServiceStatus() {
  const checkUrl = async (url: string): Promise<boolean> => {
    try {
      const ctrl = new AbortController()
      const timeout = setTimeout(() => ctrl.abort(), 5000)
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
      clearTimeout(timeout)
      return res.ok || res.status < 500
    } catch {
      return false
    }
  }

  const [n8n, coolify] = await Promise.all([
    checkUrl('https://n8n-nfd9.srv1514641.hstgr.cloud'),
    checkUrl('http://187.77.246.185:8000'),
  ])
  return { n8n, coolify }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatCLP(usd: number): string {
  const clp = Math.round(usd * 950)
  return clp.toLocaleString('es-CL')
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

function eventTypeColor(type: string): string {
  switch (type?.toLowerCase()) {
    case 'error': return '#f87171'
    case 'warning': return '#fbbf24'
    case 'success': case 'task_complete': return '#4ade80'
    case 'task_start': return '#60a5fa'
    default: return '#818cf8'
  }
}

function eventTypeIcon(type: string): string {
  switch (type?.toLowerCase()) {
    case 'error': return '❌'
    case 'warning': return '⚠️'
    case 'success': case 'task_complete': return '✅'
    case 'task_start': return '🚀'
    default: return '📌'
  }
}

function agentInitial(name: string): string {
  return (name || 'S').charAt(0).toUpperCase()
}

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [summary, events, services] = await Promise.all([
    getSummary(),
    getRecentEvents(),
    getServiceStatus(),
  ])

  const now = new Date().toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const stats = [
    {
      label: 'Proyectos Activos',
      value: summary.activeProjects.toString(),
      icon: '📁',
      trend: '↑',
      trendColor: '#4ade80',
      variant: 'green' as const,
    },
    {
      label: 'Agentes Activos',
      value: summary.activeAgents.toString(),
      icon: '🤖',
      trend: '→',
      trendColor: '#60a5fa',
      variant: 'blue' as const,
    },
    {
      label: 'Tokens Hoy',
      value: formatNumber(summary.tokensToday),
      icon: '⚡',
      trend: summary.tokensToday > 0 ? '↑' : '—',
      trendColor: '#fb923c',
      variant: 'orange' as const,
    },
    {
      label: 'Costo Hoy',
      value: `$${summary.costUsd.toFixed(4)}`,
      sub: `$${formatCLP(summary.costUsd)} CLP`,
      icon: '💰',
      trend: summary.costUsd > 0 ? '↑' : '—',
      trendColor: '#fb923c',
      variant: 'orange' as const,
    },
  ]

  const serviceList = [
    { name: 'n8n', up: services.n8n, ping: '—' },
    { name: 'Coolify', up: services.coolify, ping: '—' },
    { name: 'PostgreSQL', up: true, ping: '—' },
    { name: 'GitHub', up: true, ping: '—' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-start justify-between animate-fade-up gap-2">
        <div>
          <h1
            className="text-xl md:text-3xl font-extrabold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #34d399 45%, #6ee7b7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Mission Control
          </h1>
          <p className="mt-1 text-xs md:text-sm capitalize" style={{ color: '#64748b' }}>{now}</p>
        </div>
        {/* Service badges — scroll horizontal en mobile */}
        <div className="flex gap-1.5 overflow-x-auto flex-shrink-0 max-w-[50%] md:max-w-none pb-1">
          {serviceList.map((s) => (
            <ServiceBadge key={s.name} name={s.name} up={s.up} />
          ))}
        </div>
      </div>

      {/* ── Stats Grid ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* ── Services row ─────────────────────────────── */}
      <div
        className="card"
        style={{ animationDelay: '0.1s' }}
      >
        <h2 className="text-sm font-semibold mb-3 md:mb-4" style={{ color: '#94a3b8' }}>
          Estado de Servicios
        </h2>
        {/* Scroll horizontal en mobile */}
        <div className="overflow-x-auto -mx-1">
          <div className="flex md:grid md:grid-cols-4 gap-3 min-w-max md:min-w-0 px-1">
            {serviceList.map((s) => (
              <ServiceRow key={s.name} name={s.name} up={s.up} ping={s.ping} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Activity Feed ────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>
            Actividad Reciente
          </h2>
          <span className="text-xs" style={{ color: '#475569' }}>últimas 24h</span>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14" style={{ color: '#475569' }}>
            <div className="text-4xl mb-3 animate-float">🛸</div>
            <p className="text-sm font-medium" style={{ color: '#64748b' }}>Sin actividad en las últimas 24 horas</p>
            <p className="text-xs mt-1" style={{ color: '#334155' }}>Los agentes están esperando órdenes</p>
          </div>
        ) : (
          <div className="space-y-1">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 py-2.5 px-2 rounded-xl transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, rgba(26,107,60,0.5), rgba(230,126,34,0.3))' }}
                >
                  {agentInitial(event.agent_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>{event.agent_name}</span>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ color: eventTypeColor(event.event_type), background: `${eventTypeColor(event.event_type)}18` }}
                    >
                      {event.event_type}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: '#64748b' }}>{event.description}</p>
                </div>
                <span className="text-[10px] whitespace-nowrap mt-0.5" style={{ color: '#475569' }}>
                  {timeAgo(event.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────── */

function StatCard({
  label, value, sub, icon, trend, trendColor, variant,
}: {
  label: string
  value: string
  sub?: string
  icon: string
  trend: string
  trendColor: string
  variant: 'green' | 'blue' | 'orange'
}) {
  const borderColor = {
    green: 'rgba(26,107,60,0.35)',
    blue: 'rgba(59,130,246,0.3)',
    orange: 'rgba(230,126,34,0.35)',
  }[variant]

  const iconBg = {
    green: 'rgba(34,197,94,0.12)',
    blue: 'rgba(59,130,246,0.12)',
    orange: 'rgba(230,126,34,0.12)',
  }[variant]

  return (
    <div
      className="card card-lift animate-fade-up"
      style={{ borderColor }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: '#64748b' }}>
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight" style={{ color: '#f1f5f9' }}>{value}</p>
          {sub && <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{sub}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: iconBg }}
          >
            {icon}
          </div>
          <span className="text-xs font-semibold" style={{ color: trendColor }}>{trend}</span>
        </div>
      </div>
    </div>
  )
}

function ServiceBadge({ name, up }: { name: string; up: boolean }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
      style={{
        background: up ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${up ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
        color: up ? '#4ade80' : '#f87171',
      }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${up ? 'dot-pulse' : ''}`}
        style={{ background: up ? '#4ade80' : '#f87171' }}
      />
      {name}
    </div>
  )
}

function ServiceRow({ name, up, ping }: { name: string; up: boolean; ping: string }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.025)' }}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${up ? 'dot-pulse' : ''}`}
          style={{ background: up ? '#4ade80' : '#f87171' }}
        />
        <span className="text-xs font-medium" style={{ color: '#cbd5e1' }}>{name}</span>
      </div>
      <span className="text-[10px]" style={{ color: '#475569' }}>{ping}ms</span>
    </div>
  )
}
