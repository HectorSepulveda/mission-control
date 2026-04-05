'use client'

import { useEffect, useState } from 'react'

interface Metrics {
  cpu_pct: number
  ram_gb: number
  ram_pct: number
  disk_gb: number
  disk_pct: number
  uptime_h: number
  timestamp: string
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(pct, 100)}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
    </div>
  )
}

function statusColor(pct: number) {
  if (pct > 85) return '#f87171'
  if (pct > 70) return '#fbbf24'
  return '#4ade80'
}

export default function VpsMetricsWidget() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [lastPoll, setLastPoll] = useState<string>('')

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/vps-metrics')
        if (res.ok) {
          const d = await res.json()
          setMetrics(d)
          setLastPoll(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
        }
      } catch {}
    }
    fetch_()
    const iv = setInterval(fetch_, 60000) // cada 60s (límite de rate de Hostinger)
    return () => clearInterval(iv)
  }, [])

  if (!metrics) return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">🖥️ VPS</h2>
      </div>
      <div className="text-xs text-gray-600 text-center py-4">Cargando métricas...</div>
    </div>
  )

  const cpuColor = statusColor(metrics.cpu_pct)
  const ramColor = statusColor(metrics.ram_pct)
  const diskColor = statusColor(metrics.disk_pct)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">🖥️ VPS — KVM 4</h2>
        <span className="text-[10px] text-gray-600">↻ {lastPoll}</span>
      </div>
      <div className="space-y-3">
        {/* CPU */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-400">CPU</span>
            <span className="text-xs font-bold" style={{ color: cpuColor }}>{metrics.cpu_pct.toFixed(1)}%</span>
          </div>
          <Bar pct={metrics.cpu_pct} color={cpuColor} />
        </div>
        {/* RAM */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-400">RAM</span>
            <span className="text-xs font-bold" style={{ color: ramColor }}>{metrics.ram_gb.toFixed(1)} / 16 GB ({metrics.ram_pct.toFixed(1)}%)</span>
          </div>
          <Bar pct={metrics.ram_pct} color={ramColor} />
        </div>
        {/* Disco */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-400">Disco</span>
            <span className="text-xs font-bold" style={{ color: diskColor }}>{metrics.disk_gb.toFixed(0)} / 200 GB ({metrics.disk_pct.toFixed(1)}%)</span>
          </div>
          <Bar pct={metrics.disk_pct} color={diskColor} />
        </div>
        {/* Uptime */}
        <div className="flex justify-between pt-2 border-t border-dark-border">
          <span className="text-[10px] text-gray-600">Uptime</span>
          <span className="text-[10px] text-gray-400">{metrics.uptime_h.toFixed(1)}h</span>
        </div>
      </div>
    </div>
  )
}
