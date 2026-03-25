import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get project name first (token_usage uses project name, not UUID)
    const projectRows = await query<{ name: string }>(
      'SELECT name FROM projects WHERE id = $1',
      [params.id]
    )
    if (projectRows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const projectName = projectRows[0].name

    const [buildRows, operationRows, monthlyRows] = await Promise.all([
      query<{ total: string }>(`
        SELECT COALESCE(SUM(cost_usd), 0) as total
        FROM token_usage
        WHERE project = $1 AND phase = 'build'
      `, [projectName]),
      query<{ total: string }>(`
        SELECT COALESCE(SUM(cost_usd), 0) as total
        FROM token_usage
        WHERE project = $1 AND phase = 'operation'
      `, [projectName]),
      query<{ month: string; total: string }>(`
        SELECT DATE_TRUNC('month', created_at) as month,
               COALESCE(SUM(cost_usd), 0) as total
        FROM token_usage
        WHERE project = $1 AND phase = 'operation'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
        LIMIT 12
      `, [projectName]),
    ])

    return NextResponse.json({
      build: parseFloat(buildRows[0]?.total || '0'),
      operation: parseFloat(operationRows[0]?.total || '0'),
      operationByMonth: monthlyRows.map(r => ({
        month: r.month,
        total: parseFloat(r.total),
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
