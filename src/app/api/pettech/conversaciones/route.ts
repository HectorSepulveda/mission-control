import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (email) {
      const rows = await query(
        'SELECT * FROM conversaciones WHERE cliente_email = $1 ORDER BY creado_en DESC LIMIT $2',
        [email, limit]
      )
      return NextResponse.json(rows)
    }

    const rows = await query('SELECT * FROM conversaciones ORDER BY creado_en DESC LIMIT $1', [limit])
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { cliente_email, tipo, pedido_numero, contenido, shopify_order_id, enviado = false } = body

    if (!cliente_email || !tipo) {
      return NextResponse.json({ error: 'cliente_email y tipo requeridos' }, { status: 400 })
    }

    const rows = await query(
      `INSERT INTO conversaciones (cliente_email, tipo, pedido_numero, contenido, shopify_order_id, enviado)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [cliente_email, tipo, pedido_numero || null, contenido || null, shopify_order_id || null, enviado]
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }
}
