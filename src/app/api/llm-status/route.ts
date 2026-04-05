import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface LlmRouterStateRow {
  active_provider: string | null
  active_model: string | null
  provider_statuses: unknown
  last_switch_at: string | null
  updated_at: string | null
}

export async function GET() {
  try {
    const rows = await query<LlmRouterStateRow>(
      `SELECT active_provider, active_model, provider_statuses, last_switch_at, updated_at
       FROM core.llm_router_state
       LIMIT 1`
    )

    if (rows.length === 0) {
      return NextResponse.json({
        active_provider: null,
        active_model: null,
        provider_statuses: {},
        last_switch_at: null,
        updated_at: null,
      })
    }

    const row = rows[0]
    return NextResponse.json({
      active_provider: row.active_provider,
      active_model: row.active_model,
      provider_statuses: row.provider_statuses ?? {},
      last_switch_at: row.last_switch_at,
      updated_at: row.updated_at,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'error' },
      { status: 500 }
    )
  }
}
