import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await query('SELECT * FROM projects ORDER BY created_at DESC')
    return NextResponse.json(rows)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
