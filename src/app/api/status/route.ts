import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function pingUrl(url: string): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now()
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    return { ok: res.ok || res.status < 500, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}

async function pingPostgres(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now()
  try {
    const pool = getPool()
    await pool.query('SELECT 1')
    return { ok: true, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}

export async function GET() {
  const [n8n, coolify, postgres] = await Promise.all([
    pingUrl('https://n8n-nfd9.srv1514641.hstgr.cloud'),
    pingUrl('http://187.77.246.185:8000'),
    pingPostgres(),
  ])
  return NextResponse.json({
    n8n: n8n.ok,
    n8nLatencyMs: n8n.latencyMs,
    coolify: coolify.ok,
    coolifyLatencyMs: coolify.latencyMs,
    postgres: postgres.ok,
    postgresLatencyMs: postgres.latencyMs,
  })
}
