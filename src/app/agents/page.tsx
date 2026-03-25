import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface Agent {
  id: string
  name: string
  role: string
  model: string
  status: string
  tokens_used: number
  last_active: string | null
  personality: string | null
  skills: string[] | null
  cost_per_1k_tokens: number | null
}

async function getAgents(): Promise<Agent[]> {
  try {
    return await query<Agent>(`
      SELECT id, name, role, model, status,
             COALESCE(tokens_used,0) as tokens_used,
             last_active, personality, skills, cost_per_1k_tokens
      FROM agents ORDER BY
        CASE status WHEN 'active' THEN 0 WHEN 'working' THEN 1 ELSE 2 END, name
    `)
  } catch { return [] }
}

const COST_EXAMPLES = [
  { task: 'Análisis de arquitectura (4k tokens)', agent: 'CTO Agent', cost: '~$0.060' },
  { task: 'Escribir componente (2k tokens)', agent: 'Dev Agent', cost: '~$0.006' },
  { task: 'Revisar QA (1k tokens)', agent: 'QA Agent', cost: '~$0.001' },
  { task: 'Post Instagram (500 tokens)', agent: 'Marketing', cost: '~$0.0015' },
  { task: 'Buscar tendencias (1k tokens)', agent: 'Research', cost: '~$0.0001' },
]

function roleEmoji(role: string) {
  const r = (role || '').toLowerCase()
  if (r.includes('cto') || r.includes('architect')) return '🧠'
  if (r.includes('dev') || r.includes('engineer')) return '💻'
  if (r.includes('qa') || r.includes('quality')) return '🧪'
  if (r.includes('market') || r.includes('content')) return '📣'
  if (r.includes('research')) return '🔍'
  if (r.includes('manager') || r.includes('pm')) return '📋'
  if (r.includes('image') || r.includes('visual')) return '🎨'
  return '🤖'
}

function timeAgo(date: string | null) {
  if (!date) return 'Nunca'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora mismo'
  if (mins < 60) return `${mins}m atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

function formatTokens(n: number) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function providerInfo(model: string) {
  const m = (model || '').toLowerCase()
  if (m.includes('claude')) return { name: 'Anthropic', color: '#fb923c' }
  if (m.includes('gpt')) return { name: 'OpenAI', color: '#4ade80' }
  if (m.includes('gemini')) return { name: 'Google', color: '#a78bfa' }
  return { name: model || '—', color: '#94a3b8' }
}

function costColor(cost: number | null) {
  if (!cost) return '#94a3b8'
  if (cost >= 0.01) return '#f97316'
  if (cost >= 0.002) return '#60a5fa'
  return '#4ade80'
}

export default async function AgentsPage() {
  const agents = await getAgents()
  const active = agents.filter(a => a.status === 'active' || a.status === 'working').length

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes 🤖</h1>
          <p className="text-sm text-gray-500 mt-1">
            {agents.length} registrados · {active} activos
          </p>
        </div>
        <span className="badge-green text-xs px-3 py-1.5">{active} activos</span>
      </div>

      {agents.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-gray-500 text-sm">No hay agentes registrados</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {agents.map((agent) => {
              const provider = providerInfo(agent.model)
              const tokenPct = Math.min(((agent.tokens_used || 0) / 100000) * 100, 100)
              const isActive = agent.status === 'active'
              const isWorking = agent.status === 'working'
              const skills = Array.isArray(agent.skills) ? agent.skills.slice(0, 4) : []

              return (
                <div key={agent.id} className="card hover:border-brand-green/30 transition-all duration-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-brand-green/20">
                      {roleEmoji(agent.role)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm text-white">{agent.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{agent.role}</p>
                        </div>
                        {agent.cost_per_1k_tokens != null && (
                          <span className="text-[10px] font-mono shrink-0" style={{ color: costColor(agent.cost_per_1k_tokens) }}>
                            ${agent.cost_per_1k_tokens.toFixed(agent.cost_per_1k_tokens >= 0.01 ? 3 : 4)}/1k
                          </span>
                        )}
                      </div>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {skills.map(s => (
                            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-dark-muted/30 text-gray-500 border border-dark-border">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {agent.personality && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{agent.personality}</p>
                  )}

                  <div className="mb-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${isActive ? 'badge-green' : isWorking ? 'badge-orange' : 'badge-gray'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400' : isWorking ? 'bg-orange-400' : 'bg-gray-600'}`} />
                      {isActive ? '● Activo' : isWorking ? '⚡ Trabajando' : '○ En espera'}
                    </span>
                    <p className="text-[10px] text-gray-700 mt-1">Solo se activa cuando hay tarea asignada</p>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                      <span>Tokens usados</span>
                      <span className="font-mono">{formatTokens(agent.tokens_used || 0)}</span>
                    </div>
                    <div className="h-1 bg-dark-muted/30 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-brand-green/60" style={{ width: `${tokenPct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded border"
                      style={{ color: provider.color, borderColor: `${provider.color}40`, background: `${provider.color}15` }}>
                      {provider.name}
                    </span>
                    <span className="text-[10px] text-gray-600">{timeAgo(agent.last_active)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">💡 Costo estimado por tipo de tarea</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="text-left pb-2 pr-4 text-gray-500 font-medium">Tarea</th>
                    <th className="text-left pb-2 pr-4 text-gray-500 font-medium">Agente</th>
                    <th className="text-right pb-2 text-gray-500 font-medium">Costo USD</th>
                  </tr>
                </thead>
                <tbody>
                  {COST_EXAMPLES.map((row, i) => (
                    <tr key={i} className={i < COST_EXAMPLES.length - 1 ? 'border-b border-dark-border/40' : ''}>
                      <td className="py-2.5 pr-4 text-gray-400">{row.task}</td>
                      <td className="py-2.5 pr-4"><span className="badge-gray text-[10px]">{row.agent}</span></td>
                      <td className="py-2.5 text-right font-mono font-semibold text-green-400">{row.cost}</td>
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
