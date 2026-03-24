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
    case 'error': return 'text-red-400'
    case 'warning': return 'text-yellow-400'
    case 'success': return 'text-green-400'
    case 'task_complete': return 'text-green-400'
    default: return 'text-blue-400'
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Mission Control ⭐</h1>
          <p className="text-gray-500 mt-1 capitalize">{now}</p>
        </div>
        <div className="flex gap-3">
          <ServiceBadge name="n8n" up={services.n8n} />
          <ServiceBadge name="Coolify" up={services.coolify} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          label="Proyectos Activos"
          value={summary.activeProjects.toString()}
          icon="📁"
          color="green"
        />
        <SummaryCard
          label="Agentes Activos"
          value={summary.activeAgents.toString()}
          icon="🤖"
          color="blue"
        />
        <SummaryCard
          label="Tokens Hoy"
          value={formatNumber(summary.tokensToday)}
          icon="🔤"
          color="orange"
        />
        <SummaryCard
          label="Costo Hoy"
          value={`$${summary.costUsd.toFixed(4)}`}
          subtitle={`$${formatCLP(summary.costUsd)} CLP`}
          icon="💰"
          color="orange"
        />
      </div>

      {/* Activity Feed */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">
          Actividad Reciente
          <span className="ml-2 text-sm text-gray-500 font-normal">(últimas 24h)</span>
        </h2>
        {events.length === 0 ? (
          <p className="text-gray-600 text-sm py-8 text-center">Sin actividad en las últimas 24 horas</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 py-2 border-b border-dark-border last:border-0">
                <span className="text-base mt-0.5">{eventTypeIcon(event.event_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{event.agent_name}</span>
                    <span className={`text-xs ${eventTypeColor(event.event_type)}`}>
                      {event.event_type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{event.description}</p>
                </div>
                <span className="text-xs text-gray-600 whitespace-nowrap">{timeAgo(event.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string
  value: string
  subtitle?: string
  icon: string
  color: 'green' | 'blue' | 'orange'
}) {
  const borderColor = {
    green: 'border-brand-green/30',
    blue: 'border-blue-500/30',
    orange: 'border-brand-orange/30',
  }[color]

  const iconBg = {
    green: 'bg-brand-green/10',
    blue: 'bg-blue-500/10',
    orange: 'bg-brand-orange/10',
  }[color]

  return (
    <div className={`card border ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`${iconBg} rounded-lg p-2 text-xl`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function ServiceBadge({ name, up }: { name: string; up: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
      up
        ? 'bg-green-500/10 border-green-500/30 text-green-400'
        : 'bg-red-500/10 border-red-500/30 text-red-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${up ? 'bg-green-400' : 'bg-red-400'}`} />
      {name}: {up ? 'UP' : 'DOWN'}
    </div>
  )
}
