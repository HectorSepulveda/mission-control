import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dayOfMonth = now.getDate()
    const daysRemaining = daysInMonth - dayOfMonth

    const [budgetRows, spentRows, dailyRows] = await Promise.all([
      query<{ budget_usd: string; spent_usd: string }>(`
        SELECT budget_usd, spent_usd
        FROM monthly_budget
        WHERE DATE_TRUNC('month', month) = DATE_TRUNC('month', NOW())
        LIMIT 1
      `),
      query<{ total: string }>(`
        SELECT COALESCE(SUM(cost_usd), 0) as total
        FROM token_usage
        WHERE created_at >= $1 AND created_at < $2
      `, [monthStart, monthEnd]),
      query<{ day: string; total: string }>(`
        SELECT DATE_TRUNC('day', created_at) as day,
               COALESCE(SUM(cost_usd), 0) as total
        FROM token_usage
        WHERE created_at >= $1 AND created_at < $2
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY day
      `, [monthStart, monthEnd]),
    ])

    const budgetUsd = parseFloat(budgetRows[0]?.budget_usd || '50')
    const spentUsd = parseFloat(spentRows[0]?.total || '0')

    // Calculate daily rate for projection
    const dailyAvg = dayOfMonth > 0 ? spentUsd / dayOfMonth : 0
    const projected = dailyAvg * daysInMonth

    return NextResponse.json({
      budgetUsd,
      spentUsd,
      projected,
      daysRemaining,
      dayOfMonth,
      daysInMonth,
      dailyAvg,
      dailyBreakdown: dailyRows.map(r => ({
        day: r.day,
        total: parseFloat(r.total),
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
