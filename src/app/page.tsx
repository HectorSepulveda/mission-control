import { query } from '@/lib/db'

/* ── Types ───────────────────────────────────────────── */
interface SummaryData {
  activeProjects: number
  activeAgents: number
  tokensToday: number
  costUsd: number
  tasksInProgress: number
  errorAlerts: number
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

interface BudgetData {
  budgetUsd: number
  spentUsd: number
  projected: number
  daysRemaining: number
  dayOfMonth: number
  daysInMonth: number
}

interface Event {
  id: number
  agent_name: string
  event_type: string
  description: string
  created_at: string
}

interface ServiceStatus {
  n8n: boolean
  coolify: boolean
  postgres: boolean
}

/* ── Data fetchers ───────────────────────────────────── */
async function getSummary(): Promise<SummaryData> {
  try {
    const [proj, agents, tokens, tasks, alerts] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) as count FROM projects WHERE status = 'active'`),
      query<{ count: string }>(`SELECT COUNT(*) as count FROM agent_activity WHERE status IN ('active', 'working')`),
      query<{ tokens: string; cost: string }>(`
        SELECT COALESCE(SUM(input_tokens + output_tokens), 0) as tokens,
               COALESCE(SUM(cost_usd), 0) as cost
        FROM token_usage
        WHERE created_at >= CURRENT_DATE
      `),
      query<{ count: string }>(`SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress'`),
      query<{ count: string }>(`
        SELECT COUNT(*) as count FROM agent_events
        WHERE event_type = 'error'
        AND created_at >= NOW() - INTERVAL '24 hours'
      `),
    ])
    return {
      activeProjects: parseInt(proj[0]?.count || '0'),
      activeAgents: parseInt(agents[0]?.count || '0'),
      tokensToday: parseInt(tokens[0]?.tokens || '0'),
      costUsd: parseFloat(tokens[0]?.cost || '0'),
      tasksInProgress: parseInt(tasks[0]?.count || '0'),
      errorAlerts: parseInt(alerts[0]?.count || '0'),
    }
  } catch {
    return { activeProjects: 0, activeAgents: 0, tokensToday: 0, costUsd: 0, tasksInProgress: 0, errorAlerts: 0 }
  }
}

async function getAgentActivity(): Promise<AgentActivity[]> {
  try {
    return await query<AgentActivity>(`
      SELECT aa.*,
             COALESCE(a.name, aa.agent_id) as agent_name
      FROM agent_activity aa
      LEFT JOIN agents a ON a.id::text = aa.agent_id OR a.name = aa.agent_id
      ORDER BY aa.updated_at DESC
    `)
  } catch {
    return []
  }
}

async function getBudget(): Promise<BudgetData> {
  try {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dayOfMonth = now.getDate()
    const daysRemaining = daysInMonth - dayOfMonth
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    const [budgetRows, spentRows] = await Promise.all([
      query<{ budget_usd: string }>(`
        SELECT budget_usd FROM monthly_budget
        WHERE DATE_TRUNC('month', month) = DATE_TRUNC('month', NOW())
        LIMIT 1
      `),
      query<{ total: string }>(`
        SELECT COALESCE(SUM(cost_usd), 0) as total
        FROM token_usage
        WHERE created_at >= $1 AND created_at < $2
      `, [monthStart, monthEnd]),
    ])

    const budgetUsd = parseFloat(budgetRows[0]?.budget_usd || '50')
    const spentUsd = parseFloat(spentRows[0]?.total || '0')
    const dailyAvg = dayOfMonth > 0 ? spentUsd / dayOfMonth : 0
    const projected = dailyAvg * daysInMonth

    return { budgetUsd, spentUsd, projected, daysRemaining, dayOfMonth, daysInMonth }
  } catch {
    return { budgetUsd: 50, spentUsd: 0, projected: 0, daysRemaining: 0, dayOfMonth: 1, daysInMonth: 30 }
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

async function getServiceStatus(): Promise<ServiceStatus> {
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
  return { n8n, coolify, postgres: true }
}

/* ── Helpers ─────────────────────────────────────────── */
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatCLP(usd: number): string {
  return Math.round(usd * 950).toLocaleString('es-CL')
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

function agentInitial(name: string): string {
  return (name || 'S').charAt(0).toUpperCase()
}

function agentStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active': return '#4ade80'
    case 'working': return '#fb923c'
    default: return '#64748b'
  }
}

function agentStatusLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active': return 'Activo'
    case 'working': return 'Trabajando'
    default: return 'Inactivo'
  }
}

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [summary, agentActivity, budget, events, services] = await Promise.all([
    getSummary(),
    getAgentActivity(),
    getBudget(),
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

  const serviceList = [
    { name: 'n8n', up: services.n8n },
    { name: 'Coolify', up: services.coolify },
    { name: 'PostgreSQL', up: services.postgres },
    { name: 'GitHub', up: true },
  ]

  const hasAlerts = summary.errorAlerts > 0
  const budgetPct = budget.budgetUsd > 0 ? Math.min((budget.spentUsd / budget.budgetUsd) * 100, 100) : 0
  const budgetColor = budgetPct > 90 ? '#f87171' : budgetPct > 70 ? '#fbbf24' : '#4ade80'

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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">

      {/* ── FILA 1: Header + Alertas ───────────────────── */}
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
            ⚡ War Room
          </h1>
          <p className="mt-1 text-xs md:text-sm capitalize" style={{ color: '#64748b' }}>{now}</p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto flex-shrink-0 max-w-[55%] md:max-w-none pb-1 flex-wrap justify-end">
          {serviceList.map((s) => (
            <ServiceBadge key={s.name} name={s.name} up={s.up} />
          ))}
        </div>
      </div>

      {/* ── Alert strip ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up">
        <AlertCard
          icon={hasAlerts ? '🚨' : '✅'}
          label="Alertas"
          value={hasAlerts ? `${summary.errorAlerts} error${summary.errorAlerts > 1 ? 'es' : ''}` : 'Sin alertas'}
          color={hasAlerts ? '#f87171' : '#4ade80'}
          bg={hasAlerts ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.06)'}
          border={hasAlerts ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.2)'}
        />
        <AlertCard
          icon="⚡"
          label="Tokens hoy"
          value={formatNumber(summary.tokensToday)}
          color="#fb923c"
          bg="rgba(251,146,60,0.08)"
          border="rgba(251,146,60,0.25)"
        />
        <AlertCard
          icon="🤖"
          label="Agentes activos"
          value={`${summary.activeAgents} en línea`}
          color="#60a5fa"
          bg="rgba(96,165,250,0.08)"
          border="rgba(96,165,250,0.25)"
        />
        <AlertCard
          icon="📋"
          label="Tareas en progreso"
          value={`${summary.tasksInProgress} tareas`}
          color="#818cf8"
          bg="rgba(129,140,248,0.08)"
          border="rgba(129,140,248,0.25)"
        />
      </div>

      {/* ── FILA 2: Agentes EN ESTE MOMENTO ────────────── */}
      <div className="card animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>
            🤖 Agentes Ahora
          </h2>
          <span
            className="text-xs px-2 py-1 rounded-lg font-medium"
            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
          >
            {agentActivity.filter(a => a.status === 'active' || a.status === 'working').length} activos
          </span>
        </div>

        {agentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10" style={{ color: '#475569' }}>
            <div className="text-4xl mb-3 animate-float">😴</div>
            <p className="text-sm font-medium" style={{ color: '#64748b' }}>Sin actividad de agentes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agentActivity.map((agent) => {
              const isActive = agent.status === 'active' || agent.status === 'working'
              const statusColor = agentStatusColor(agent.status)
              return (
                <div
                  key={agent.id}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.015)',
                    border: `1px solid ${isActive ? `${statusColor}25` : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold relative"
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${statusColor}30, ${statusColor}15)`
                        : 'rgba(100,116,139,0.15)',
                      border: `1px solid ${statusColor}40`,
                    }}
                  >
                    {agentInitial(agent.agent_name || agent.agent_id)}
                    {isActive && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full dot-pulse"
                        style={{ background: statusColor }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
                        {agent.agent_name || agent.agent_id}
                      </span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}35` }}
                      >
                        {agentStatusLabel(agent.status)}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ color: '#94a3b8', background: 'rgba(148,163,184,0.08)' }}
                      >
                        {agent.project}
                      </span>
                    </div>

                    {isActive ? (
                      <>
                        <p className="text-xs mt-1 font-medium" style={{ color: '#cbd5e1' }}>
                          {agent.task_title || 'Tarea sin título'}
                        </p>
                        {agent.current_step && (
                          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                            ↳ {agent.current_step}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs mt-1" style={{ color: '#475569' }}>
                        Último trabajo: {agent.task_title || '—'} — {timeAgo(agent.updated_at)}
                      </p>
                    )}
                  </div>

                  {/* Right side */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px]" style={{ color: '#475569' }}>{timeAgo(agent.started_at)}</p>
                    {agent.tokens_this_task > 0 && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>
                        {formatNumber(agent.tokens_this_task)} tok
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── FILA 3: Stats cards ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* ── FILA 4: Budget del mes ──────────────────────── */}
      <div className="card animate-fade-up" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>
            💰 Budget del Mes
          </h2>
          <span className="text-xs" style={{ color: '#475569' }}>
            {budget.daysRemaining} días restantes
          </span>
        </div>

        <div className="space-y-3">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>
                ${budget.spentUsd.toFixed(4)} USD gastado
              </span>
              <span className="text-xs font-semibold" style={{ color: budgetColor }}>
                {budgetPct.toFixed(1)}%
              </span>
            </div>
            <div
              className="w-full h-2.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${budgetPct}%`,
                  background: `linear-gradient(90deg, ${budgetColor}, ${budgetColor}aa)`,
                  boxShadow: `0 0 8px ${budgetColor}50`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color: '#475569' }}>$0</span>
              <span className="text-[10px]" style={{ color: '#475569' }}>Presupuesto: ${budget.budgetUsd} USD</span>
            </div>
          </div>

          {/* Projection */}
          <div
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div>
              <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>📈 Proyección al cierre del mes</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: budget.projected > budget.budgetUsd ? '#f87171' : '#4ade80' }}>
                ${budget.projected.toFixed(4)} USD
                {' '}
                <span className="text-xs font-normal" style={{ color: '#64748b' }}>
                  (${formatCLP(budget.projected)} CLP)
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px]" style={{ color: '#475569' }}>Promedio diario</p>
              <p className="text-xs font-semibold" style={{ color: '#60a5fa' }}>
                ${budget.spentUsd > 0 ? (budget.spentUsd / budget.dayOfMonth).toFixed(5) : '0.00000'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILA 5: Services + Activity ─────────────────── */}
      <div className="card" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-sm font-semibold mb-3 md:mb-4" style={{ color: '#94a3b8' }}>
          Estado de Servicios
        </h2>
        <div className="overflow-x-auto -mx-1">
          <div className="flex md:grid md:grid-cols-4 gap-3 min-w-max md:min-w-0 px-1">
            {serviceList.map((s) => (
              <ServiceRow key={s.name} name={s.name} up={s.up} />
            ))}
          </div>
        </div>
      </div>

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

function AlertCard({
  icon, label, value, color, bg, border,
}: {
  icon: string
  label: string
  value: string
  color: string
  bg: string
  border: string
}) {
  return (
    <div
      className="rounded-2xl p-3 flex items-center gap-2.5"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <span className="text-xl">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: '#64748b' }}>{label}</p>
        <p className="text-sm font-bold truncate" style={{ color }}>{value}</p>
      </div>
    </div>
  )
}

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
    <div className="card card-lift animate-fade-up" style={{ borderColor }}>
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

function ServiceRow({ name, up }: { name: string; up: boolean }) {
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
      <span className="text-[10px]" style={{ color: up ? '#4ade80' : '#f87171' }}>
        {up ? 'online' : 'offline'}
      </span>
    </div>
  )
}
