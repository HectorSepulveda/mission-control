import { query } from '@/lib/db'
import AgentFlowCanvas from '@/components/AgentFlowCanvas'

export const dynamic = 'force-dynamic'

export default async function FlowPage() {
  let agents: unknown[] = []
  let messages: unknown[] = []

  try {
    agents = await query(`
      SELECT id, COALESCE(agent_key, LOWER(REPLACE(name,' ','-'))) as agent_key,
             name, role, COALESCE(team,'core') as team,
             COALESCE(level,'specialist') as level,
             reports_to, model, status,
             COALESCE(tokens_used,0) as tokens_used, last_active,
             cost_per_1k_tokens,
             COALESCE(phase,1) as phase,
             COALESCE(is_blocked,false) as is_blocked
      FROM agents ORDER BY name
    `)
  } catch {
    // fallback empty
  }

  try {
    messages = await query(`
      SELECT * FROM agent_messages
      WHERE status IN ('pending', 'read')
      ORDER BY created_at DESC
      LIMIT 50
    `)
  } catch {
    // fallback empty
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        // On desktop, account for sidebar width (w-14 = 56px, lg:w-[220px])
        // We use CSS variable approach; just fill the remaining space
        display: 'flex',
        flexDirection: 'column',
      }}
      className="md:pl-14 lg:pl-[220px] pb-0"
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(6,6,8,0.9)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>🔀</span>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: '#f1f5f9',
            }}
          >
            Factory Flow
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>
            Canvas de agentes · Actualización cada 5s
          </p>
        </div>
      </div>

      {/* Canvas fills remaining space */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AgentFlowCanvas
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialAgents={agents as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialMessages={messages as any}
        />
      </div>
    </div>
  )
}
