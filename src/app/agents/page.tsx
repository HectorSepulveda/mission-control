import { query } from '@/lib/db'
import Link from 'next/link'

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
    return await query<Agent>(`SELECT * FROM agents ORDER BY cost_per_1k_tokens DESC NULLS LAST`)
  } catch {
    return []
  }
}

function roleEmoji(role: string): string {
  const r = (role || '').toLowerCase()
  if (r.includes('cto') || r.includes('architect')) return '🧠'
  if (r.includes('dev') || r.includes('engineer')) return '💻'
  if (r.includes('qa') || r.includes('quality')) return '🧪'
  if (r.includes('market') || r.includes('content')) return '📣'
  if (r.includes('research')) return '🔍'
  if (r.includes('manager') || r.includes('pm')) return '📋'
  if (r.includes('astro') || r.includes('orquest')) return '⭐'
  return '🤖'
}

function timeAgo(date: string | null): string {
  if (!date) return 'Nunca'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora mismo'
  if (mins < 60) return `${mins}m atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

function formatTokens(n: number): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function providerInfo(model: string): { name: string; color: string } {
  const m = (model || '').toLowerCase()
  if (m.includes('claude')) return { name: 'Anthropic', color: '#fb923c' }
  if (m.includes('gpt')) return { name: 'OpenAI', color: '#4ade80' }
  if (m.includes('gemini')) return { name: 'Google', color: '#a78bfa' }
  return { name: model || '—', color: '#94a3b8' }
}

function costTier(cost: number | null): { label: string; color: string } {
  if (!cost) return { label: 'Gratis', color: '#94a3b8' }
  if (cost >= 0.01) return { label: `$${cost.toFixed(3)}/1k · Premium`, color: '#f97316' }
  if (cost >= 0.002) return { label: `$${cost.toFixed(3)}/1k · Standard`, color: '#60a5fa' }
  if (cost >= 0.0005) return { label: `$${cost.toFixed(4)}/1k · Económico`, color: '#4ade80' }
  return { label: `$${cost.toFixed(4)}/1k · Ultra-eco`, color: '#34d399' }
}

function parseSkills(skills: string[] | null): string[] {
  if (!skills) return []
  if (Array.isArray(skills)) return skills.slice(0, 4)
  return []
}

export const dynamic = 'force-dynamic'

const COST_EXAMPLES = [
  { task: 'Análisis de arquitectura (4k tokens)', agent: 'CTO Agent', cost: '~$0.060' },
  { task: 'Escribir componente (2k tokens)', agent: 'Dev Agent', cost: '~$0.006' },
  { task: 'Revisar QA (1k tokens)', agent: 'QA Agent', cost: '~$0.001' },
  { task: 'Post Instagram (500 tokens)', agent: 'Marketing', cost: '~$0.0015' },
  { task: 'Buscar tendencias (1k tokens)', agent: 'Research', cost: '~$0.0001' },
]

export default async function AgentsPage() {
  const agents = await getAgents()
  const active = agents.filter(a => a.status === 'active' || a.status === 'working').length

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes 🤖</h1>
          <p className="text-sm text-gray-500 mt-1">{agents.length} registrados · {active} activos ahora</p>
        </div>
        <span className="px-3 py-1.5 rounded-lg text-xs font-medium badge-green">
          {active} activos
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {agents.map((agent) => {
          const provider = providerInfo(agent.model)
          const cost = costTier(agent.cost_per_1k_tokens)
          const skills = parseSkills(agent.skills)
          const tokenPct = Math.min(((agent.tokens_used || 0) / 100000) * 100, 100)
          const isActive = agent.status === 'active'
          const isWorking = agent.status === 'working'

          return (
            <div key={agent.id} className="card hover:border-brand-green/30 transition-all duration-200">
              {/* Avatar + name */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1A6B3C, #22c55e)' }}>
                  {roleEmoji(agent.role)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm text-white leading-tight">{agent.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{agent.role}</p>
                    </div>
                    <span className="text-xs font-mono shrink-0" style={{ color: cost.color }}>
                      {cost.label.split(' · ')[0]}
                    </span>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {skills.map(s => (
                        <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-dark-muted/30 text-gray-500 border border-dark-border">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Personalidad */}
              {agent.personality && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{agent.personality}</p>
              )}

              {/* Status */}
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${
                  isActive ? 'badge-green' : isWorking ? 'badge-orange working-badge' : 'badge-gray'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400' : isWorking ? 'bg-orange-400' : 'bg-gray-600'}`} />
                  {isActive ? '● Activo' : isWorking ? '⚡ Trabajando' : '○ En espera'}
                </span>
                <p className="text-[10px] text-gray-700 mt-1">Solo se activa cuando hay tarea asignada</p>
              </div>

              {/* Token bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                  <span>Tokens usados</span>
                  <span className="font-mono">{formatTokens(agent.tokens_used || 0)}</span>
                </div>
                <div className="h-1 bg-dark-muted/30 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-brand-green/60" style={{ width: `${tokenPct}%` }} />
                </div>
              </div>

              {/* Footer */}
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

      {/* Cost estimator */}
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
                  <td className="py-2.5 pr-4">
                    <span className="badge-gray text-[10px]">{row.agent}</span>
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold text-green-400">{row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
