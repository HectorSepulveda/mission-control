import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await query('SELECT * FROM tasks ORDER BY created_at DESC')
    return NextResponse.json(rows)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, status = 'backlog', priority = 'medium', assignee } = body

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const rows = await query(
      `INSERT INTO tasks (title, description, status, priority, assignee, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [title, description || null, status, priority, assignee || null]
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
