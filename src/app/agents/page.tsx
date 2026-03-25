import { query } from '@/lib/db'

interface Agent {
  id: string
  name: string
  role: string
  model: string
  status: string
  tokens_used: number
  last_active: string
  personality: string
  skills: string[] | null
  cost_per_1k_tokens: number | null
  config_skills: string | null
  system_prompt: string | null
}

async function getAgents(): Promise<Agent[]> {
  try {
    return await query<Agent>(`
      SELECT a.*, ac.skills as config_skills, ac.system_prompt
      FROM agents a
      LEFT JOIN agent_config ac ON LOWER(REPLACE(a.name, ' Agent', '')) = ac.agent_id
         OR LOWER(a.name) = ac.agent_id
      ORDER BY a.cost_per_1k_tokens DESC NULLS LAST
    `)
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
      return {
        label: '● Activo',
        color: '#4ade80',
        bg: 'rgba(34,197,94,0.1)',
        border: 'rgba(34,197,94,0.25)',
        pulse: true,
        shimmer: false,
      }
    case 'working':
      return {
        label: '⚡ Trabajando',
        color: '#fb923c',
        bg: 'rgba(230,126,34,0.1)',
        border: 'rgba(230,126,34,0.25)',
        pulse: false,
        shimmer: true,
      }
    default:
      return {
        label: '○ En espera',
        color: '#64748b',
        bg: 'rgba(100,116,139,0.08)',
        border: 'rgba(100,116,139,0.2)',
        pulse: false,
        shimmer: false,
      }
  }
}

function costBadge(cost: number | null): { label: string; tier: string; color: string; bg: string; border: string } | null {
  if (cost === null || cost === undefined) return null
  const formatted = cost >= 0.01
    ? `$${cost.toFixed(3)}/1k`
    : `$${cost.toFixed(4)}/1k`

  if (cost >= 0.01)
    return { label: formatted, tier: 'Premium', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' }
  if (cost >= 0.002)
    return { label: formatted, tier: 'Standard', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)' }
  if (cost >= 0.0005)
    return { label: formatted, tier: 'Económico', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.3)' }
  return { label: formatted, tier: 'Ultra-económico', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)' }
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

const COST_EXAMPLES = [
  { task: 'Análisis arquitectura (4k tokens)', agent: 'CTO Agent', cost: '~$0.060 USD' },
  { task: 'Escribir un componente (2k tokens)', agent: 'Dev Agent', cost: '~$0.006 USD' },
  { task: 'Revisar QA (1k tokens)', agent: 'QA Agent', cost: '~$0.001 USD' },
  { task: 'Post para Instagram (500 tokens)', agent: 'Marketing', cost: '~$0.0015 USD' },
  { task: 'Buscar tendencias (1k tokens)', agent: 'Research', cost: '~$0.0001 USD' },
]

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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {agents.map((agent) => {
              const provider = providerFromModel(agent.model)
              const status = statusConfig(agent.status)
              const tokenPct = Math.min((agent.tokens_used || 0) / 100000 * 100, 100)
              const cost = costBadge(agent.cost_per_1k_tokens)
              const skills: string[] = Array.isArray(agent.skills)
                ? agent.skills
                : typeof agent.skills === 'string' && agent.skills
                  ? (agent.skills as string).replace(/[{}"]/g, '').split(',').map((s: string) => s.trim()).filter(Boolean)
                  : []

              return (
                <div
                  key={agent.id}
                  className="card card-lift"
                  style={{
                    borderColor: 'rgba(255,255,255,0.07)',
                  }}
                >
                  {/* Top row: avatar + info */}
                  <div className="flex items-start gap-4 mb-3">
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: agentGradient(agent.name) }}
                    >
                      {roleEmoji(agent.role)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm leading-snug" style={{ color: '#f1f5f9' }}>
                            {agent.name}
                          </h3>
                          {agent.role && (
                            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{agent.role}</p>
                          )}
                        </div>
                        {/* Cost badge */}
                        {cost && (
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            <span
                              className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                              style={{ color: cost.color, background: cost.bg, border: `1px solid ${cost.border}` }}
                            >
                              {cost.label}
                            </span>
                            <span className="text-[9px]" style={{ color: cost.color, opacity: 0.75 }}>
                              {cost.tier}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Skills tags */}
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {skills.slice(0, 4).map((skill) => (
                            <span
                              key={skill}
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.15)' }}
                            >
                              {skill}
                            </span>
                          ))}
                          {skills.length > 4 && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full"
                              style={{ color: '#64748b' }}
                            >
                              +{skills.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description / Personality */}
                  {agent.personality && (
                    <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: '#94a3b8' }}>
                      {agent.personality}
                    </p>
                  )}

                  {/* Status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 w-fit ${status.shimmer ? 'working-badge' : ''}`}
                        style={{ color: status.color, background: status.bg, border: `1px solid ${status.border}` }}
                      >
                        {status.pulse && (
                          <span className="w-1.5 h-1.5 rounded-full dot-pulse" style={{ background: status.color }} />
                        )}
                        {status.label}
                      </span>
                      <span className="text-[9px]" style={{ color: '#475569' }}>
                        Solo se activa cuando hay tarea asignada
                      </span>
                    </div>
                  </div>

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

          {/* Cost estimator table */}
          <div
            className="mt-8 rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
              💡 Costo estimado por tipo de tarea
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <th className="text-left pb-2 pr-4" style={{ color: '#64748b', fontWeight: 500 }}>Tarea</th>
                    <th className="text-left pb-2 pr-4" style={{ color: '#64748b', fontWeight: 500 }}>Agente</th>
                    <th className="text-right pb-2" style={{ color: '#64748b', fontWeight: 500 }}>Costo estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {COST_EXAMPLES.map((row, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: i < COST_EXAMPLES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    >
                      <td className="py-2.5 pr-4" style={{ color: '#94a3b8' }}>{row.task}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px]"
                          style={{ background: 'rgba(148,163,184,0.08)', color: '#64748b', border: '1px solid rgba(148,163,184,0.12)' }}
                        >
                          {row.agent}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold" style={{ color: '#4ade80' }}>{row.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
