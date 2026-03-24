import { query } from '@/lib/db'

interface Project {
  id: number
  name: string
  description: string
  status: string
  stack: string
  created_at: string
  updated_at: string
}

async function getProjects(): Promise<Project[]> {
  try {
    return await query<Project>(`SELECT * FROM projects ORDER BY created_at DESC`)
  } catch {
    return []
  }
}

function statusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case 'active':
      return <span className="badge-green">● Activo</span>
    case 'paused':
      return <span className="badge-gray">⏸ Pausado</span>
    case 'completed':
      return <span className="badge-green">✓ Completado</span>
    case 'archived':
      return <span className="badge-gray">📦 Archivado</span>
    default:
      return <span className="badge-gray">{status || 'Sin estado'}</span>
  }
}

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const projects = await getProjects()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Proyectos 📁</h1>
          <p className="text-gray-500 mt-1">{projects.length} proyecto{projects.length !== 1 ? 's' : ''} en total</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-gray-500">No hay proyectos aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card hover:border-brand-green/40 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-white text-base">{project.name}</h3>
                {statusBadge(project.status)}
              </div>
              
              {project.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{project.description}</p>
              )}
              
              {project.stack && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {project.stack.split(',').map((tech, i) => (
                    <span key={i} className="text-xs bg-dark-muted/30 text-gray-400 px-2 py-0.5 rounded border border-dark-border">
                      {tech.trim()}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                <span className="text-xs text-gray-600">
                  {project.updated_at
                    ? new Date(project.updated_at).toLocaleDateString('es-CL')
                    : new Date(project.created_at).toLocaleDateString('es-CL')}
                </span>
                <button className="text-xs text-brand-green hover:text-brand-green-light font-medium transition-colors">
                  Ver detalle →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
