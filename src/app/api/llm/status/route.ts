import { NextResponse } from 'next/server'
import { getProviderStatus } from '@/lib/llm-router'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const providers = getProviderStatus()

    // Costos por proveedor hoy
    const costsToday = await query<{
      provider: string; model: string; tokens: string; cost: string
    }>(`
      SELECT provider, model,
             SUM(input_tokens + output_tokens)::text as tokens,
             SUM(cost_usd)::text as cost
      FROM token_usage
      WHERE created_at >= CURRENT_DATE
      GROUP BY provider, model
      ORDER BY SUM(cost_usd) DESC
    `)

    // Costos por proveedor este mes
    const costsMonth = await query<{
      provider: string; tokens: string; cost: string
    }>(`
      SELECT provider,
             SUM(input_tokens + output_tokens)::text as tokens,
             SUM(cost_usd)::text as cost
      FROM token_usage
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      GROUP BY provider
      ORDER BY SUM(cost_usd) DESC
    `)

    return NextResponse.json({
      providers,
      costsToday,
      costsMonth,
      ollamaAvailable: !!process.env.OLLAMA_BASE_URL || true,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
