'use client'

import { useState, useEffect, useCallback } from 'react'

interface CommitInfo {
  sha: string
  message: string
  author_name: string
  author_login: string | null
  author_avatar: string | null
  date: string
  url: string
}

interface GithubActivityData {
  commits?: CommitInfo[]
  error?: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

function commitTypeLabel(message: string): { label: string; color: string } {
  const lower = message.toLowerCase()
  if (lower.startsWith('feat')) return { label: 'feat', color: '#4ade80' }
  if (lower.startsWith('fix')) return { label: 'fix', color: '#f87171' }
  if (lower.startsWith('chore')) return { label: 'chore', color: '#94a3b8' }
  if (lower.startsWith('refactor')) return { label: 'refactor', color: '#60a5fa' }
  if (lower.startsWith('docs')) return { label: 'docs', color: '#a78bfa' }
  if (lower.startsWith('style')) return { label: 'style', color: '#fb923c' }
  if (lower.startsWith('test')) return { label: 'test', color: '#fbbf24' }
  return { label: 'commit', color: '#818cf8' }
}

export default function GithubActivityWidget() {
  const [data, setData] = useState<GithubActivityData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/github-activity', { cache: 'no-store' })
      const json = await res.json() as GithubActivityData
      setData(json)
    } catch {
      setData({ error: 'Error de conexión' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchActivity()
    const interval = setInterval(() => { void fetchActivity() }, 300000)
    return () => clearInterval(interval)
  }, [fetchActivity])

  return (
    <div className="card animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🐙</span>
          <h2 className="text-sm font-semibold" style={{ color: '#94a3b8' }}>GitHub — Commits Recientes</h2>
        </div>
        <a
          href="https://github.com/HectorSepulveda/mission-control"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2 py-1 rounded-lg transition-colors"
          style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
        >
          Ver repo →
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6" style={{ color: '#475569' }}>
          <span className="text-xs">Cargando commits...</span>
        </div>
      ) : data?.error ? (
        <div className="flex items-center gap-2 py-4">
          <span className="text-[11px]" style={{ color: '#f87171' }}>⚠️ {data.error}</span>
        </div>
      ) : !data?.commits?.length ? (
        <div className="flex flex-col items-center justify-center py-6" style={{ color: '#475569' }}>
          <span className="text-xs">Sin commits recientes</span>
        </div>
      ) : (
        <div className="space-y-1">
          {data.commits.map((commit) => {
            const { label, color } = commitTypeLabel(commit.message)
            return (
              <a
                key={commit.sha}
                href={commit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 py-2.5 px-2 rounded-xl transition-colors group"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', textDecoration: 'none' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.3), rgba(129,140,248,0.3))' }}
                >
                  {commit.author_avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={commit.author_avatar} alt={commit.author_login ?? commit.author_name} className="w-full h-full object-cover" />
                  ) : (
                    (commit.author_login ?? commit.author_name).charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ color, background: `${color}18` }}
                    >
                      {label}
                    </span>
                    <code className="text-[9px]" style={{ color: '#475569' }}>{commit.sha}</code>
                  </div>
                  <p
                    className="text-xs font-medium truncate group-hover:underline"
                    style={{ color: '#e2e8f0', textDecoration: 'none' }}
                  >
                    {commit.message}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>
                    {commit.author_login ?? commit.author_name} · {timeAgo(commit.date)}
                  </p>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
