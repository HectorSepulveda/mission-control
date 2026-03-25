import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await query('SELECT * FROM reportes_stock ORDER BY fecha DESC LIMIT 30')
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fecha, reporte, productos_revisados = 0, alertas_stock = 0 } = body

    if (!reporte) return NextResponse.json({ error: 'reporte requerido' }, { status: 400 })

    const rows = await query(
      `INSERT INTO reportes_stock (fecha, reporte, productos_revisados, alertas_stock)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [fecha || new Date().toISOString().split('T')[0], reporte, productos_revisados, alertas_stock]
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }
}
