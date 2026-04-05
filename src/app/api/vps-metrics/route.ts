import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const token = process.env.HOSTINGER_API_TOKEN
    const vmId = process.env.HOSTINGER_VM_ID || '1514641'

    if (!token) {
      return NextResponse.json({ error: 'HOSTINGER_API_TOKEN no configurado' }, { status: 503 })
    }

    const now = new Date()
    const from = new Date(now.getTime() - 10 * 60 * 1000).toISOString() // últimos 10 min
    const to = now.toISOString()

    const res = await fetch(
      `https://developers.hostinger.com/api/vps/v1/virtual-machines/${vmId}/metrics?date_from=${from}&date_to=${to}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store' }
    )

    if (!res.ok) throw new Error(`Hostinger API: ${res.status}`)

    const data = await res.json()

    // Obtener el último valor de cada métrica
    const lastValue = (obj: Record<string, number>) => {
      const vals = Object.values(obj)
      return vals[vals.length - 1] ?? 0
    }

    const ram_bytes = lastValue(data.ram_usage?.usage ?? {})
    const disk_bytes = lastValue(data.disk_space?.usage ?? {})
    const cpu_pct = lastValue(data.cpu_usage?.usage ?? {})
    const uptime_sec = lastValue(data.uptime?.usage ?? {})

    const ram_gb = ram_bytes / 1024 ** 3
    const disk_gb = disk_bytes / 1024 ** 3
    const RAM_TOTAL_GB = 16
    const DISK_TOTAL_GB = 200

    return NextResponse.json({
      cpu_pct: cpu_pct,
      ram_gb: parseFloat(ram_gb.toFixed(2)),
      ram_pct: parseFloat(((ram_gb / RAM_TOTAL_GB) * 100).toFixed(1)),
      disk_gb: parseFloat(disk_gb.toFixed(1)),
      disk_pct: parseFloat(((disk_gb / DISK_TOTAL_GB) * 100).toFixed(1)),
      uptime_h: parseFloat((uptime_sec / 3600).toFixed(1)),
      timestamp: now.toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
