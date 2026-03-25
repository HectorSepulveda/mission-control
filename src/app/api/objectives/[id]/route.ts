import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { current_value } = body

    if (current_value === undefined || current_value === null) {
      return NextResponse.json({ error: 'current_value required' }, { status: 400 })
    }

    const rows = await query(
      `UPDATE objectives
       SET current_value = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [current_value, params.id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (err) {
    console.error('PATCH /api/objectives/[id] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
