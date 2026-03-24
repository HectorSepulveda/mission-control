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
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

function StatusBadge({ status }: { status: string }) {
  switch (status?.toLowerCase()) {
    case 'active':
      return <span className="badge-green">● Activo</span>
    case 'working':
      return (
        <span className="badge-orange working-badge">⚡ Trabajando</span>
      )
    case 'idle':
    default:
      return <span className="badge-gray">○ Inactivo</span>
  }
}

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const agents = await getAgents()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes 🤖</h1>
          <p className="text-gray-500 mt-1">{agents.length} agente{agents.length !== 1 ? 's' : ''} registrado{agents.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-gray-500">No hay agentes registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className={`card transition-colors ${
              agent.status === 'working' ? 'border-brand-orange/30' :
              agent.status === 'active' ? 'border-brand-green/30' :
              ''
            }`}>
              <div className="flex items-start gap-3 mb-4">
                <div className="text-3xl">{roleEmoji(agent.role)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white">{agent.name}</h3>
                    <StatusBadge status={agent.status} />
                  </div>
                  {agent.role && (
                    <p className="text-xs text-gray-500 mt-0.5">{agent.role}</p>
                  )}
                </div>
              </div>

              {agent.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{agent.description}</p>
              )}

              <div className="space-y-2 pt-3 border-t border-dark-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Modelo</span>
                  <span className="text-gray-300 font-mono">{agent.model || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Tokens usados</span>
                  <span className="text-gray-300">{formatNumber(agent.tokens_used)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Última actividad</span>
                  <span className="text-gray-300">{timeAgo(agent.last_active)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
