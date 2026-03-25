import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/pettech/productos?estado=activo&select=nombre,keyword_busqueda,shopify_product_id
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const estado = searchParams.get('estado') || 'activo'
    const selectParam = searchParams.get('select')
    
    let fields = '*'
    if (selectParam) {
      // Sanitizar campos
      const allowed = ['id','nombre','keyword_busqueda','categoria','estado','shopify_product_id','precio_base','stock_actual','stock_minimo','proveedor','proveedor_sku','created_at','updated_at']
      const requested = selectParam.split(',').map(f => f.trim()).filter(f => allowed.includes(f))
      if (requested.length) fields = requested.join(', ')
    }

    const rows = await query(`SELECT ${fields} FROM productos_pendientes WHERE estado = $1 ORDER BY nombre`, [estado])
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }
}

// POST /api/pettech/productos — crear o actualizar producto
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, keyword_busqueda, categoria, estado = 'activo', proveedor, proveedor_sku, shopify_product_id, precio_base, stock_actual, stock_minimo } = body

    if (!nombre) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })

    const rows = await query(
      `INSERT INTO productos_pendientes (nombre, keyword_busqueda, categoria, estado, proveedor, proveedor_sku, shopify_product_id, precio_base, stock_actual, stock_minimo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT DO NOTHING RETURNING *`,
      [nombre, keyword_busqueda, categoria, estado, proveedor, proveedor_sku, shopify_product_id, precio_base, stock_actual || 0, stock_minimo || 5]
    )
    return NextResponse.json(rows[0] || { message: 'ya existe' }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }
}

// PATCH /api/pettech/productos — actualizar stock
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { shopify_product_id, stock_actual } = body
    if (!shopify_product_id) return NextResponse.json({ error: 'shopify_product_id requerido' }, { status: 400 })

    await query(
      `UPDATE productos_pendientes SET stock_actual=$1, updated_at=now() WHERE shopify_product_id=$2`,
      [stock_actual, shopify_product_id]
    )
    return NextResponse.json({ updated: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }
}
