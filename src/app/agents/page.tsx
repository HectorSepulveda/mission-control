import { query } from '@/lib/db'

interface Agent {
  id: number
  name: string
  role: string
  model: string
  status: string
  tokens_used: number
  last_active: string
  description: string
}

async function getAgents(): Promise<Agent[]> {
  try {
    return await query<Agent>(`SELECT * FROM agents ORDER BY last_active DESC NULLS LAST`)
  } catch {
    return []
  }
}

function roleEmoji(role: string): string {
  switch (role?.toLowerCase()) {
    case 'developer': case 'dev': return '👨‍💻'
    case 'analyst': case 'analysis': return '🔍'
    case 'writer': case 'content': return '✍️'
    case 'manager': case 'orchestrator': return '🎯'
    case 'researcher': return '🧪'
    case 'designer': return '🎨'
    case 'ops': case 'devops': return '⚙️'
    case 'support': return '🤝'
    default: return '🤖'
  }
}

function formatNumber(n: number): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function timeAgo(date: string): string {
  if (!date) return 'Nunca'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora mismo'
  if (mins < 60) return `${mins}m atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

function providerFromModel(model: string): { name: string; color: string; bg: string; border: string } {
  const m = model?.toLowerCase() || ''
  if (m.includes('claude') || m.includes('anthropic'))
    return { name: 'Anthropic', color: '#fb923c', bg: 'rgba(230,126,34,0.1)', border: 'rgba(230,126,34,0.25)' }
  if (m.includes('gpt') || m.includes('openai'))
    return { name: 'OpenAI', color: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' }
  if (m.includes('gemini') || m.includes('google'))
    return { name: 'Google', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' }
  return { name: model || '—', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' }
}

function statusConfig(status: string) {
  switch (status?.toLowerCase()) {
    case 'active':
      return { label: 'Activo', color: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', pulse: true }
    case 'working':
      return { label: 'Trabajando', color: '#fb923c', bg: 'rgba(230,126,34,0.1)', border: 'rgba(230,126,34,0.25)', pulse: false, shimmer: true }
    default:
      return { label: 'Inactivo', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)', pulse: false }
  }
}

function agentGradient(name: string): string {
  const gradients = [
    'linear-gradient(135deg, #1A6B3C, #22c55e)',
    'linear-gradient(135deg, #1d4ed8, #60a5fa)',
    'linear-gradient(135deg, #7c3aed, #a78bfa)',
    'linear-gradient(135deg, #b45309, #fb923c)',
    'linear-gradient(135deg, #0e7490, #22d3ee)',
    'linear-gradient(135deg, #9d174d, #f472b6)',
  ]
  const idx = (name?.charCodeAt(0) || 0) % gradients.length
  return gradients[idx]
}

function providerGlow(model: string): string {
  const m = model?.toLowerCase() || ''
  if (m.includes('claude') || m.includes('anthropic')) return 'rgba(230,126,34,0.25)'
  if (m.includes('gpt') || m.includes('openai')) return 'rgba(34,197,94,0.2)'
  if (m.includes('gemini') || m.includes('google')) return 'rgba(139,92,246,0.2)'
  return 'rgba(255,255,255,0.05)'
}

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const agents = await getAgents()

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8 animate-fade-up">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Agentes
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            {agents.length} agente{agents.length !== 1 ? 's' : ''} registrado{agents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}
        >
          {agents.filter(a => a.status === 'active' || a.status === 'working').length} activos
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="card text-center py-20">
          <div className="text-5xl mb-4 animate-float">🤖</div>
          <p className="font-semibold" style={{ color: '#64748b' }}>No hay agentes registrados</p>
          <p className="text-sm mt-1" style={{ color: '#334155' }}>Los agentes aparecerán aquí cuando se registren</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {agents.map((agent) => {
            const provider = providerFromModel(agent.model)
            const status = statusConfig(agent.status)
            const tokenPct = Math.min((agent.tokens_used || 0) / 100000 * 100, 100)

            return (
              <div
                key={agent.id}
                className="card card-lift agent-card"
                style={{
                  borderColor: 'rgba(255,255,255,0.07)',
                  // @ts-ignore
                  '--provider-glow': providerGlow(agent.model),
                }}
              >
                {/* Top row: avatar + info */}
                <div className="flex items-start gap-4 mb-4">
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: agentGradient(agent.name) }}
                  >
                    {roleEmoji(agent.role)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm leading-snug" style={{ color: '#f1f5f9' }}>
                        {agent.name}
                      </h3>
                      {/* Status badge */}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1 ${status.shimmer ? 'working-badge' : ''}`}
                        style={{ color: status.color, background: status.bg, border: `1px solid ${status.border}` }}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${status.pulse ? 'dot-pulse' : ''}`}
                          style={{ background: status.color }}
                        />
                        {status.label}
                      </span>
                    </div>
                    {agent.role && (
                      <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{agent.role}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                {agent.description && (
                  <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: '#94a3b8' }}>
                    {agent.description}
                  </p>
                )}

                {/* Token bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px]" style={{ color: '#475569' }}>Tokens usados</span>
                    <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{formatNumber(agent.tokens_used)}</span>
                  </div>
                  <div className="token-bar">
                    <div className="token-bar-fill" style={{ width: `${tokenPct}%` }} />
                  </div>
                </div>

                {/* Meta row */}
                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {/* Model badge */}
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded border font-mono"
                    style={{ color: provider.color, background: provider.bg, borderColor: provider.border }}
                  >
                    {provider.name}
                  </span>
                  {/* Last active */}
                  <span className="text-[10px]" style={{ color: '#475569' }}>
                    {timeAgo(agent.last_active)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
