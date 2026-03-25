'use client'

import { useEffect, useState } from 'react'

interface Objective {
  id: number
  project: string
  title: string
  type: string
  target_value: number
  current_value: number
  unit: string
  deadline: string | null
  status: string
}

function progressColor(pct: number): string {
  if (pct >= 70) return '#4ade80'
  if (pct >= 30) return '#fbbf24'
  return '#f87171'
}

function statusColor(status: string): { bg: string; color: string } {
  switch (status?.toLowerCase()) {
    case 'completed': return { bg: 'rgba(74,222,128,0.12)', color: '#4ade80' }
    case 'active': case 'in_progress': return { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' }
    case 'at_risk': return { bg: 'rgba(251,146,60,0.12)', color: '#fb923c' }
    case 'behind': return { bg: 'rgba(239,68,68,0.12)', color: '#f87171' }
    default: return { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' }
  }
}

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function typeLabel(type: string): string {
  switch (type) {
    case 'okr': return 'OKR'
    case 'kpi': return 'KPI'
    case 'milestone': return 'Hito'
    case 'revenue': return 'Revenue'
    default: return type
  }
}

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/objectives')
      .then(r => r.json())
      .then(data => {
        setObjectives(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Group by project
  const projects = Array.from(new Set(objectives.map(o => o.project))).sort()

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          background: 'linear-gradient(135deg, #22c55e, #34d399 50%, #fb923c)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          🎯 Objetivos
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
          OKRs y KPIs del negocio
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: '#475569', fontSize: 14 }}>
          Cargando objetivos...
        </div>
      ) : objectives.length === 0 ? (
        <div style={{
          padding: '80px 0',
          textAlign: 'center',
          color: '#475569',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ fontSize: 14, fontWeight: 500 }}>Sin objetivos registrados</p>
          <p style={{ fontSize: 12, marginTop: 4, color: '#334155' }}>Agrega registros en la tabla <code>objectives</code></p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {projects.map(project => {
            const projectObjs = objectives.filter(o => o.project === project)
            const completedCount = projectObjs.filter(o => {
              const pct = o.target_value > 0 ? (o.current_value / o.target_value) * 100 : 0
              return pct >= 100
            }).length

            return (
              <div key={project}>
                {/* Project header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
                    {project}
                  </h2>
                  <span style={{
                    fontSize: 11,
                    color: '#64748b',
                    padding: '2px 10px',
                    borderRadius: 99,
                    background: 'rgba(100,116,139,0.1)',
                    border: '1px solid rgba(100,116,139,0.2)',
                  }}>
                    {completedCount}/{projectObjs.length} completados
                  </span>
                </div>

                {/* Objectives grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 12,
                }}>
                  {projectObjs.map(obj => {
                    const pct = obj.target_value > 0
                      ? Math.min(Math.round((obj.current_value / obj.target_value) * 100), 100)
                      : 0
                    const barColor = progressColor(pct)
                    const sc = statusColor(obj.status)

                    return (
                      <div
                        key={obj.id}
                        style={{
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: 14,
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        {/* Top row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3 }}>
                              {obj.title}
                            </p>
                            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 99,
                                background: 'rgba(129,140,248,0.12)',
                                color: '#818cf8',
                                border: '1px solid rgba(129,140,248,0.25)',
                              }}>
                                {typeLabel(obj.type)}
                              </span>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 99,
                                background: sc.bg,
                                color: sc.color,
                                border: `1px solid ${sc.color}30`,
                              }}>
                                {obj.status}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 22, fontWeight: 800, color: barColor, lineHeight: 1 }}>
                              {pct}%
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div>
                          <div style={{
                            height: 6,
                            borderRadius: 99,
                            background: 'rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${pct}%`,
                              borderRadius: 99,
                              background: `linear-gradient(90deg, ${barColor}, ${barColor}bb)`,
                              boxShadow: `0 0 6px ${barColor}60`,
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: 4,
                          }}>
                            <span style={{ fontSize: 11, color: '#64748b' }}>
                              {obj.current_value.toLocaleString('es-CL')} {obj.unit}
                            </span>
                            <span style={{ fontSize: 11, color: '#475569' }}>
                              / {obj.target_value.toLocaleString('es-CL')} {obj.unit}
                            </span>
                          </div>
                        </div>

                        {/* Deadline */}
                        {obj.deadline && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 11, color: '#475569' }}>📅</span>
                            <span style={{ fontSize: 11, color: '#475569' }}>
                              Deadline: {formatDeadline(obj.deadline)}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
