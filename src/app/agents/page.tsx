import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface Agent {
  id: string
  agent_key: string | null
  name: string
  role: string
  team: string
  level: string
  reports_to: string | null
  model: string
  status: string
  tokens_used: number
  last_active: string | null
  personality: string | null
  skills: string[] | null
  cost_per_1k_tokens: number | null
  phase: number
  is_blocked: boolean
}

async function getAgents(): Promise<Agent[]> {
  try {
    return await query<Agent>(`
      SELECT id, agent_key, name, role,
             COALESCE(team,'core') as team,
             COALESCE(level,'specialist') as level,
             reports_to, model, status,
             COALESCE(tokens_used,0) as tokens_used,
             last_active, personality, skills,
             cost_per_1k_tokens,
             COALESCE(phase,1) as phase,
             COALESCE(is_blocked,false) as is_blocked
      FROM agents
      ORDER BY
        CASE COALESCE(team,'core') WHEN 'core' THEN 0 WHEN 'strategy' THEN 1 WHEN 'marketing' THEN 2 WHEN 'dev' THEN 3 ELSE 4 END,
        CASE COALESCE(level,'specialist') WHEN 'master' THEN 0 WHEN 'sub-orchestrator' THEN 1 ELSE 2 END,
        name
    `)
  } catch { return [] }
}

const TEAM_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  core:      { label: 'Núcleo',            emoji: '⭐', color: '#1A6B3C' },
  strategy:  { label: 'Equipo Estrategia', emoji: '📋', color: '#3b82f6' },
  marketing: { label: 'Equipo Marketing',  emoji: '📣', color: '#f43f5e' },
  dev:       { label: 'Equipo Desarrollo', emoji: '💻', color: '#8b5cf6' },
}

function roleEmoji(role: string, key: string | null) {
  if (key === 'astro') return '⭐'
  if (key === 'pixel') return '🎨'
  if (key === 'publisher') return '🔒'
  const r = (role || '').toLowerCase()
  if (r.includes('cto') || r.includes('orquestador') && r.includes('des')) return '🧠'
  if (r.includes('backend')) return '⚙️'
  if (r.includes('frontend') || r.includes('ui')) return '🎨'
  if (r.includes('devops')) return '🚀'
  if (r.includes('security')) return '🛡️'
  if (r.includes('qa')) return '🧪'
  if (r.includes('marketing') && r.includes('sub')) return '📣'
  if (r.includes('seo')) return '🔍'
  if (r.includes('content')) return '✍️'
  if (r.includes('social')) return '📱'
  if (r.includes('image')) return '🖼️'
  if (r.includes('email')) return '📧'
  if (r.includes('analyst')) return '📊'
  if (r.includes('pm') || r.includes('project')) return '📋'
  if (r.includes('strategy')) return '🎯'
  if (r.includes('research')) return '🔭'
  if (r.includes('prompt')) return '🧬'
  return '🤖'
}

function providerInfo(model: string) {
  const m = (model || '').toLowerCase()
  if (m.includes('claude')) return { name: 'Anthropic', color: '#fb923c' }
  if (m.includes('gpt')) return { name: 'OpenAI', color: '#4ade80' }
  if (m.includes('gemini')) return { name: 'Google', color: '#a78bfa' }
  if (m.includes('fal') || m.includes('flux')) return { name: 'fal.ai', color: '#60a5fa' }
  return { name: model || '—', color: '#94a3b8' }
}

function levelBadge(level: string) {
  if (level === 'master') return { label: 'Orquestador Maestro', color: '#22c55e' }
  if (level === 'sub-orchestrator') return { label: 'Sub-orquestador', color: '#fb923c' }
  return { label: 'Especialista', color: '#64748b' }
}

function timeAgo(date: string | null) {
  if (!date) return 'Nunca'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

const PHASE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Fase 1 — Activa', color: '#22c55e' },
  2: { label: 'Fase 2 — Sem. 2',  color: '#fb923c' },
  3: { label: 'Fase 3 — Sem. 3',  color: '#64748b' },
}

export default async function AgentsPage() {
  const agents = await getAgents()
  const active = agents.filter(a => a.status === 'active' || a.status === 'working').length

  // Group by team
  const teams = ['core', 'strategy', 'marketing', 'dev']
  const grouped = teams.reduce((acc, t) => {
    acc[t] = agents.filter(a => (a.team || 'core') === t)
    return acc
  }, {} as Record<string, Agent[]>)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes 🤖</h1>
          <p className="text-sm text-gray-500 mt-1">{agents.length} agentes · {active} activos · 3 equipos</p>
        </div>
        <span className="badge-green text-xs px-3 py-1.5">{active} activos</span>
      </div>

      {/* Hierarchy visual */}
      <div className="card mb-6 overflow-x-auto">
        <h2 className="text-sm font-semibold text-white mb-4">🏗️ Jerarquía de Comando</h2>
        <div className="flex flex-col items-center gap-2 min-w-max mx-auto text-xs">
          {/* Héctor */}
          <div className="px-4 py-1.5 rounded-lg text-center font-bold text-white"
            style={{ background: 'rgba(230,126,34,0.2)', border: '1px solid rgba(230,126,34,0.4)' }}>
            👤 HÉCTOR
          </div>
          <div className="w-px h-4 bg-gray-700" />
          {/* Astro */}
          <div className="px-4 py-1.5 rounded-lg text-center font-semibold text-green-400"
            style={{ background: 'rgba(26,107,60,0.25)', border: '1px solid rgba(26,107,60,0.5)' }}>
            ⭐ ASTRO — Orquestador Maestro
          </div>
          <div className="flex items-start gap-8 mt-2">
            {/* Branch lines */}
            {['strategy','marketing','dev'].map(team => {
              const cfg = TEAM_CONFIG[team]
              const suborq = agents.find(a => a.team === team && a.level === 'sub-orchestrator')
              if (!suborq) return null
              return (
                <div key={team} className="flex flex-col items-center gap-1">
                  <div className="w-px h-4 bg-gray-700" />
                  <div className="px-3 py-1 rounded-lg text-center font-medium"
                    style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}50`, color: cfg.color }}>
                    {cfg.emoji} {suborq.name}
                  </div>
                  <div className="text-[9px] text-gray-600">{cfg.label}</div>
                  <div className="flex flex-col gap-1 mt-1 border-l border-dark-border pl-2">
                    {agents.filter(a => a.team === team && a.level === 'specialist').map(sp => (
                      <div key={sp.id} className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span>└</span>
                        <span>{roleEmoji(sp.role, sp.agent_key)}</span>
                        <span>{sp.name}</span>
                        {sp.is_blocked && <span className="text-red-500">🔒</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Teams */}
      {teams.map(team => {
        const teamAgents = grouped[team] || []
        if (!teamAgents.length) return null
        const cfg = TEAM_CONFIG[team]
        return (
          <div key={team} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full" style={{ background: cfg.color }} />
              <h2 className="text-sm font-semibold text-white">
                {cfg.emoji} {cfg.label}
              </h2>
              <span className="text-xs text-gray-600">({teamAgents.length} agentes)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teamAgents.map(agent => {
                const provider = providerInfo(agent.model)
                const lv = levelBadge(agent.level)
                const ph = PHASE_LABELS[agent.phase] || PHASE_LABELS[1]
                const isActive = agent.status === 'active'
                const isWorking = agent.status === 'working'
                const skills = Array.isArray(agent.skills) ? agent.skills.slice(0, 3) : []

                return (
                  <div
                    key={agent.id}
                    className="card transition-all duration-200"
                    style={{
                      borderColor: agent.is_blocked
                        ? 'rgba(239,68,68,0.3)'
                        : isActive
                        ? 'rgba(34,197,94,0.3)'
                        : agent.level === 'sub-orchestrator'
                        ? `${TEAM_CONFIG[team]?.color}40`
                        : undefined,
                      opacity: agent.phase > 1 ? 0.7 : 1,
                    }}
                  >
                    {/* Card header */}
                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{
                          background: `${cfg.color}25`,
                          border: `1px solid ${cfg.color}40`,
                        }}
                      >
                        {roleEmoji(agent.role, agent.agent_key)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-white">{agent.name}</span>
                          {agent.is_blocked && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-red-400 bg-red-500/10 border border-red-500/30">
                              BLOQUEADO
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{agent.role}</p>
                        {/* Level badge */}
                        <span
                          className="inline-block text-[9px] px-1.5 py-0.5 rounded mt-1 font-medium"
                          style={{ color: lv.color, background: `${lv.color}15`, border: `1px solid ${lv.color}30` }}
                        >
                          {lv.label}
                        </span>
                      </div>
                    </div>

                    {/* Personality */}
                    {agent.personality && (
                      <p className="text-[11px] text-gray-500 mb-2 line-clamp-2">{agent.personality}</p>
                    )}

                    {/* Skills */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {skills.map(s => (
                          <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-dark-muted/30 text-gray-600 border border-dark-border">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-dark-border">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          color: isActive ? '#4ade80' : isWorking ? '#fb923c' : '#64748b',
                          background: isActive ? 'rgba(74,222,128,0.1)' : 'rgba(100,116,139,0.08)',
                          border: `1px solid ${isActive ? 'rgba(74,222,128,0.25)' : 'rgba(100,116,139,0.15)'}`,
                        }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-600'}`} />
                        {isActive ? 'Activo' : isWorking ? 'Trabajando' : 'En espera'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                          style={{ color: ph.color, background: `${ph.color}15` }}
                        >
                          {ph.label}
                        </span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border"
                          style={{ color: provider.color, borderColor: `${provider.color}40`, background: `${provider.color}15` }}>
                          {provider.name}
                        </span>
                      </div>
                    </div>

                    {/* Reports to */}
                    {agent.reports_to && (
                      <p className="text-[9px] text-gray-700 mt-1.5">
                        Reporta a: <span className="text-gray-500">{agent.reports_to}</span>
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
