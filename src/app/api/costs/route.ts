import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await query(`
      SELECT 
        COALESCE(provider, 'unknown') as provider,
        COALESCE(model, 'unknown') as model,
        SUM(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) as tokens,
        SUM(COALESCE(cost_usd, 0)) as cost
      FROM token_usage
      GROUP BY provider, model
      ORDER BY cost DESC
    `)
    return NextResponse.json(rows)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
