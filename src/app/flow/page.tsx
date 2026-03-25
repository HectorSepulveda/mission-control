import { query } from '@/lib/db'
import AgentFlowCanvas from '@/components/AgentFlowCanvas'

export const dynamic = 'force-dynamic'

interface Agent {
  id: string
  agent_key: string
  name: string
  role: string
  team: string
  level: string
  reports_to: string | null
  model: string
  status: string
  tokens_used: number
  last_active: string | null
  cost_per_1k_tokens: number | null
  phase: number
  is_blocked: boolean
  personality: string | null
  skills: string[] | null
}

async function getAgents(): Promise<Agent[]> {
  try {
    return await query<Agent>(`
      SELECT id, COALESCE(agent_key, LOWER(REPLACE(name,' ','-'))) as agent_key,
             name, role, COALESCE(team,'core') as team,
             COALESCE(level,'specialist') as level,
             reports_to, model, status,
             COALESCE(tokens_used,0) as tokens_used, last_active,
             cost_per_1k_tokens, COALESCE(phase,1) as phase,
             COALESCE(is_blocked,false) as is_blocked,
             personality, skills
      FROM agents ORDER BY
        CASE COALESCE(team,'core') WHEN 'core' THEN 0 WHEN 'strategy' THEN 1 WHEN 'marketing' THEN 2 WHEN 'dev' THEN 3 ELSE 4 END,
        CASE COALESCE(level,'specialist') WHEN 'master' THEN 0 WHEN 'sub-orchestrator' THEN 1 ELSE 2 END,
        name
    `)
  } catch { return [] }
}

async function getMessages() {
  try {
    return await query(`SELECT * FROM agent_messages WHERE status IN ('pending','read') ORDER BY created_at DESC LIMIT 50`)
  } catch { return [] }
}

const TEAM_CONFIG: Record<string, { label: string; emoji: string; color: string; gradient: string }> = {
  core:      { label: 'Núcleo',            emoji: '⭐', color: '#22c55e',  gradient: 'linear-gradient(135deg,#1A6B3C,#22c55e)' },
  strategy:  { label: 'Equipo Estrategia', emoji: '📋', color: '#3b82f6',  gradient: 'linear-gradient(135deg,#1e40af,#3b82f6)' },
  marketing: { label: 'Equipo Marketing',  emoji: '📣', color: '#f43f5e',  gradient: 'linear-gradient(135deg,#9f1239,#f43f5e)' },
  dev:       { label: 'Equipo Desarrollo', emoji: '💻', color: '#8b5cf6',  gradient: 'linear-gradient(135deg,#5b21b6,#8b5cf6)' },
}

function roleEmoji(key: string, role: string): string {
  const emojis: Record<string, string> = {
    'astro':'⭐','prompt-engineer':'🧬','pm':'📋','strategy':'🎯','research':'🔭',
    'marketing-lead':'📣','seo':'🔍','content-writer':'✍️','social-media':'📱',
    'image-generator':'🖼️','email-marketing':'📧','campaign-analyst':'📊','publisher':'🔒',
    'cto':'🧠','backend':'⚙️','pixel':'🎨','qa-func':'🧪','qa-tech':'🔬',
    'devops':'🚀','security':'🛡️',
  }
  if (emojis[key]) return emojis[key]
  const r = role.toLowerCase()
  if (r.includes('dev') || r.includes('eng')) return '💻'
  if (r.includes('market')) return '📣'
  if (r.includes('qa')) return '🧪'
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

const PHASE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Fase 1', color: '#22c55e' },
  2: { label: 'Sem 2',  color: '#fb923c' },
  3: { label: 'Sem 3',  color: '#64748b' },
}

export default async function FlowPage() {
  const [agents, messages] = await Promise.all([getAgents(), getMessages()])
  const teams = ['core', 'strategy', 'marketing', 'dev']
  const grouped = teams.reduce((acc, t) => {
    acc[t] = agents.filter(a => (a.team || 'core') === t)
    return acc
  }, {} as Record<string, Agent[]>)

  return (
    <div className="p-4 md:p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Factory Flow 🔀</h1>
          <p className="text-sm text-gray-500 mt-1">{agents.length} agentes · actualiza cada 5s</p>
        </div>
      </div>

      {/* Canvas React Flow */}
      <div className="card mb-6 p-0 overflow-hidden" style={{ height: 520 }}>
        <AgentFlowCanvas initialAgents={agents as never} initialMessages={messages as never} />
      </div>

      {/* Fichas de agentes por equipo */}
      {teams.map(team => {
        const teamAgents = grouped[team] || []
        if (!teamAgents.length) return null
        const cfg = TEAM_CONFIG[team]
        return (
          <div key={team} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full" style={{ background: cfg.color }} />
              <h2 className="text-sm font-semibold text-white">{cfg.emoji} {cfg.label}</h2>
              <span className="text-xs text-gray-600">({teamAgents.length} agentes)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                    className="rounded-xl p-3 transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: agent.is_blocked
                        ? '1px solid rgba(239,68,68,0.3)'
                        : isActive
                        ? '1px solid rgba(34,197,94,0.3)'
                        : agent.level === 'sub-orchestrator'
                        ? `1px solid ${cfg.color}40`
                        : '1px solid rgba(255,255,255,0.07)',
                      opacity: agent.phase > 1 ? 0.75 : 1,
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: cfg.gradient }}>
                        {roleEmoji(agent.agent_key, agent.role)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs font-semibold text-white truncate">{agent.name}</span>
                          {agent.is_blocked && (
                            <span className="text-[9px] px-1 py-0.5 rounded font-bold text-red-400 bg-red-500/10 border border-red-500/30">🔒</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{agent.role}</p>
                        <span className="inline-block text-[9px] px-1.5 py-0.5 rounded mt-0.5 font-medium"
                          style={{ color: lv.color, background: `${lv.color}15`, border: `1px solid ${lv.color}30` }}>
                          {lv.label}
                        </span>
                      </div>
                    </div>

                    {/* Personality */}
                    {agent.personality && (
                      <p className="text-[10px] text-gray-500 mb-2 line-clamp-2 leading-relaxed">{agent.personality}</p>
                    )}

                    {/* Skills */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {skills.map(s => (
                          <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full text-gray-600 border border-dark-border" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-dark-border">
                      <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{
                          color: isActive ? '#4ade80' : '#64748b',
                          background: isActive ? 'rgba(74,222,128,0.1)' : 'rgba(100,116,139,0.08)',
                          border: `1px solid ${isActive ? 'rgba(74,222,128,0.25)' : 'rgba(100,116,139,0.15)'}`,
                        }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400' : isWorking ? 'bg-orange-400' : 'bg-gray-600'}`} />
                        {isActive ? 'Activo' : isWorking ? 'Working' : 'Espera'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                          style={{ color: ph.color, background: `${ph.color}15` }}>
                          {ph.label}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded border"
                          style={{ color: provider.color, borderColor: `${provider.color}40`, background: `${provider.color}15` }}>
                          {provider.name}
                        </span>
                      </div>
                    </div>
                    {agent.reports_to && (
                      <p className="text-[9px] text-gray-700 mt-1">→ reporta a: {agent.reports_to}</p>
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
