import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await query(`
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
    return NextResponse.json(rows)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
