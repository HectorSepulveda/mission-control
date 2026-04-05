import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

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

export async function GET() {
  try {
    const rows = await query<AgentMessage>(
      `SELECT id, from_agent, to_agent, message_type, content, status, created_at, updated_at
       FROM agent_messages
       WHERE from_agent = 'publisher' AND status = 'pending'
       ORDER BY created_at DESC`
    )
    return NextResponse.json({ messages: rows })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'error' },
      { status: 500 }
    )
  }
}

interface ApprovalBody {
  id: number
  action: 'approve' | 'reject'
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as ApprovalBody
    const { id, action } = body

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'id y action (approve|reject) requeridos' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    await query(
      `UPDATE agent_messages SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, id]
    )

    return NextResponse.json({ success: true, id, status: newStatus })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'error' },
      { status: 500 }
    )
  }
}
