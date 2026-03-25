import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await query(`
      SELECT aa.*, a.name as agent_name
      FROM agent_activity aa
      LEFT JOIN agents a ON a.id::text = aa.agent_id OR a.name = aa.agent_id
      ORDER BY aa.updated_at DESC
    `)
    return NextResponse.json(rows)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
