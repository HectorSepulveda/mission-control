import { query } from '@/lib/db'
import ApprovalsClient from './ApprovalsClient'

export const dynamic = 'force-dynamic'

interface AgentMessage {
  id: number
  from_agent: string
  to_agent: string | null
  message_type: string | null
  content: string | null
  status: string | null
  created_at: string
  updated_at: string | null
}

async function getPendingApprovals(): Promise<AgentMessage[]> {
  try {
    return await query<AgentMessage>(
      `SELECT id, from_agent, to_agent, message_type, content, status, created_at, updated_at
       FROM agent_messages
       WHERE from_agent = 'publisher' AND status = 'pending'
       ORDER BY created_at DESC`
    )
  } catch {
    return []
  }
}

export default async function ApprovalsPage() {
  const messages = await getPendingApprovals()

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1
            className="text-xl md:text-3xl font-extrabold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            📬 Aprobaciones
          </h1>
          <p className="mt-1 text-xs md:text-sm" style={{ color: '#64748b' }}>
            Mensajes del Publisher Agent pendientes de revisión
          </p>
        </div>
        {messages.length > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}
          >
            {messages.length} pendiente{messages.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <ApprovalsClient messages={messages} />
    </div>
  )
}
