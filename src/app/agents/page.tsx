import { query } from '@/lib/db'
import AgentsClient from './AgentsClient'

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

export default async function AgentsPage() {
  const agents = await getAgents()
  return <AgentsClient agents={agents} />
}
