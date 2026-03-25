import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await query('SELECT * FROM reportes_tendencias ORDER BY creado_en DESC LIMIT 20')
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { semana, reporte_texto, keywords_detectados = [], productos_creados = 0 } = body

    if (!reporte_texto) return NextResponse.json({ error: 'reporte_texto requerido' }, { status: 400 })

    const rows = await query(
      `INSERT INTO reportes_tendencias (semana, reporte_texto, keywords_detectados, productos_creados)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        semana || new Date().toISOString().slice(0,7),
        reporte_texto,
        JSON.stringify(keywords_detectados),
        productos_creados
      ]
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }
}
