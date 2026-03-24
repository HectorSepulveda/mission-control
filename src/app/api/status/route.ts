import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function pingUrl(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

export async function GET() {
  const [n8n, coolify] = await Promise.all([
    pingUrl('https://n8n-nfd9.srv1514641.hstgr.cloud'),
    pingUrl('http://187.77.246.185:8000'),
  ])
  return NextResponse.json({ n8n, coolify })
}
