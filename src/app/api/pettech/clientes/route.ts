import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/pettech/clientes?email=xxx@xxx.com&select=*&limit=1
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (email) {
      const rows = await query('SELECT * FROM clientes WHERE email = $1 LIMIT 1', [email])
      return NextResponse.json(rows)
    }

    const rows = await query('SELECT * FROM clientes ORDER BY created_at DESC LIMIT $1', [limit])
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }
}

// POST /api/pettech/clientes — upsert cliente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, nombre, telefono, shopify_customer_id } = body

    if (!email) return NextResponse.json({ error: 'email requerido' }, { status: 400 })

    const rows = await query(
      `INSERT INTO clientes (email, nombre, telefono, shopify_customer_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET
         nombre = COALESCE(EXCLUDED.nombre, clientes.nombre),
         telefono = COALESCE(EXCLUDED.telefono, clientes.telefono),
         shopify_customer_id = COALESCE(EXCLUDED.shopify_customer_id, clientes.shopify_customer_id),
         updated_at = now()
       RETURNING *`,
      [email, nombre || null, telefono || null, shopify_customer_id || null]
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }
}
