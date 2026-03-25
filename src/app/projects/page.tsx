import { query } from '@/lib/db'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string
  status: string
  stack: Record<string, boolean> | null
  url: string | null
  github_url: string | null
  admin_url: string | null
  health_score: number | null
  budget_usd: string | null
  created_at: string
  updated_at: string
}

async function getProjects(): Promise<Project[]> {
  try {
    return await query<Project>(`SELECT * FROM projects ORDER BY created_at DESC`)
  } catch (e) {
    console.error('Error fetching projects:', e)
    return []
  }
}

function statusConfig(status: string) {
  switch (status?.toLowerCase()) {
    case 'active':
      return { label: 'Activo', color: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' }
    case 'paused':
      return { label: 'Pausado', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' }
    case 'completed':
      return { label: 'Completado', color: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' }
    case 'archived':
      return { label: 'Archivado', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' }
    default:
      return { label: status || 'Sin estado', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' }
  }
}

const headerGradients = [
  'linear-gradient(135deg, rgba(26,107,60,0.5), rgba(34,197,94,0.15))',
  'linear-gradient(135deg, rgba(29,78,216,0.5), rgba(96,165,250,0.15))',
  'linear-gradient(135deg, rgba(124,58,237,0.5), rgba(167,139,250,0.15))',
  'linear-gradient(135deg, rgba(180,83,9,0.5), rgba(251,146,60,0.15))',
  'linear-gradient(135deg, rgba(14,116,144,0.5), rgba(34,211,238,0.15))',
  'linear-gradient(135deg, rgba(157,23,77,0.5), rgba(244,114,182,0.15))',
]

function getProjectGradient(name: string, index: number): string {
  const lname = name.toLowerCase()
  if (lname.includes('pet')) return 'linear-gradient(135deg, rgba(26,107,60,0.5), rgba(34,197,94,0.15))'
  if (lname.includes('bot') || lname.includes('trad')) return 'linear-gradient(135deg, rgba(29,78,216,0.5), rgba(96,165,250,0.15))'
  return headerGradients[index % headerGradients.length]
}

function stackEmoji(tech: string): string {
  const t = tech.toLowerCase()
  if (t.includes('next') || t.includes('react')) return '⚛️'
  if (t.includes('node') || t.includes('express')) return '🟢'
  if (t.includes('python') || t.includes('django') || t.includes('fastapi')) return '🐍'
  if (t.includes('postgres') || t.includes('sql')) return '🐘'
  if (t.includes('mongo')) return '🍃'
  if (t.includes('tail')) return '🎨'
  if (t.includes('docker') || t.includes('k8s')) return '🐳'
  if (t.includes('stripe')) return '💳'
  if (t.includes('redis')) return '🔴'
  if (t.includes('type')) return '💙'
  return '🔧'
}

function healthColor(score: number | null): string {
  if (score === null || score === undefined) return '#64748b'
  if (score >= 80) return '#4ade80'
  if (score >= 50) return '#fbbf24'
  return '#f87171'
}

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const projects = await getProjects()

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8 animate-fade-up">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Proyectos
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <div
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(26,107,60,0.1)', border: '1px solid rgba(26,107,60,0.3)', color: '#4ade80' }}
        >
          {projects.filter(p => p.status === 'active').length} activos
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card text-center py-20">
          <div className="text-5xl mb-4 animate-float">📁</div>
          <p className="font-semibold" style={{ color: '#64748b' }}>No hay proyectos aún</p>
          <p className="text-sm mt-1" style={{ color: '#334155' }}>Los proyectos aparecerán aquí cuando se creen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {projects.map((project, i) => {
            const status = statusConfig(project.status)
            const gradient = getProjectGradient(project.name, i)
            const tags = project.stack
              ? Object.entries(project.stack).filter(([, v]) => v === true).map(([k]) => k)
              : []
            const hColor = healthColor(project.health_score)

            return (
              <div
                key={project.id}
                className="card card-lift overflow-hidden"
                style={{ padding: 0 }}
              >
                {/* Card header with gradient */}
                <div className="px-5 pt-5 pb-4" style={{ background: gradient }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base leading-snug" style={{ color: '#f1f5f9' }}>
                        {project.name}
                      </h3>
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] mt-0.5 block truncate hover:underline"
                          style={{ color: 'rgba(255,255,255,0.6)' }}
                        >
                          🔗 {project.url}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: status.color, background: 'rgba(0,0,0,0.25)', border: `1px solid ${status.border}` }}
                      >
                        {status.label}
                      </span>
                      {/* Health score circle */}
                      {project.health_score !== null && (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{
                            background: `${hColor}20`,
                            border: `2px solid ${hColor}`,
                            color: hColor,
                          }}
                          title={`Health Score: ${project.health_score}`}
                        >
                          {project.health_score}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-5 pb-5 pt-4">
                  {project.description && (
                    <p className="text-sm leading-relaxed mb-4 line-clamp-2" style={{ color: '#94a3b8' }}>
                      {project.description}
                    </p>
                  )}

                  {/* Stack tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {tags.map((tech) => (
                        <span
                          key={tech}
                          className="text-[10px] font-medium px-2 py-1 rounded-lg flex items-center gap-1"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#94a3b8',
                          }}
                        >
                          {stackEmoji(tech)} {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Links row */}
                  {(project.github_url || project.admin_url) && (
                    <div className="flex gap-2 mb-4">
                      {project.github_url && (
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 hover:opacity-80 transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                        >
                          🐙 GitHub
                        </a>
                      )}
                      {project.admin_url && (
                        <a
                          href={project.admin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 hover:opacity-80 transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                        >
                          ⚙️ Admin
                        </a>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-[10px]" style={{ color: '#475569' }}>
                      {new Date(project.updated_at || project.created_at).toLocaleDateString('es-CL')}
                    </span>
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{
                        background: 'rgba(26,107,60,0.15)',
                        border: '1px solid rgba(26,107,60,0.3)',
                        color: '#4ade80',
                      }}
                    >
                      Ver detalle →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
