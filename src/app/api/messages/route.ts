import { query } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const messages = await query(`
      SELECT * FROM agent_messages
      ORDER BY created_at DESC
      LIMIT 30
    `)
    return NextResponse.json(messages)
  } catch (err) {
    console.error('GET /api/messages error:', err)
    return NextResponse.json([], { status: 200 })
  }
}
