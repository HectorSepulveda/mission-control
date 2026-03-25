import { query } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const objectives = await query(`
      SELECT * FROM objectives
      ORDER BY project, type
    `)
    return NextResponse.json(objectives)
  } catch (err) {
    console.error('GET /api/objectives error:', err)
    return NextResponse.json([], { status: 200 })
  }
}
