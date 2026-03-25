import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface Objective {
  id: string
  project: string
  title: string
  type: string
  target_value: number
  current_value: number
  unit: string
  deadline: string | null
  status: string
}

async function getObjectives(): Promise<Objective[]> {
  try {
    return await query<Objective>('SELECT * FROM objectives ORDER BY project, type')
  } catch { return [] }
}

function pct(current: number, target: number): number {
  if (!target) return 0
  return Math.min(Math.round((current / target) * 100), 100)
}

function barColor(p: number): string {
  if (p >= 70) return '#4ade80'
  if (p >= 30) return '#fbbf24'
  return '#f87171'
}

function typeLabel(type: string): string {
  return { okr: 'OKR', kpi: 'KPI', milestone: 'Hito' }[type] || type.toUpperCase()
}

function formatDeadline(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PROJECT_LABELS: Record<string, string> = {
  pettech: '🐾 PetTech Chile',
  general: '⭐ General',
  bottrading: '📈 botTrading',
}

export default async function ObjectivesPage() {
  const objectives = await getObjectives()

  const grouped = objectives.reduce((acc, obj) => {
    acc[obj.project] = acc[obj.project] || []
    acc[obj.project].push(obj)
    return acc
  }, {} as Record<string, Objective[]>)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Objetivos 🎯</h1>
        <p className="text-sm text-gray-500 mt-1">{objectives.length} objetivos activos</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-gray-500">No hay objetivos definidos aún</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([project, objs]) => (
            <div key={project} className="card">
              <h2 className="text-base font-semibold text-white mb-4">
                {PROJECT_LABELS[project] || project}
              </h2>
              <div className="space-y-4">
                {objs.map(obj => {
                  const p = pct(obj.current_value, obj.target_value)
                  const color = barColor(p)
                  return (
                    <div key={obj.id} className="p-3 rounded-lg border border-dark-border bg-dark-bg/50">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-medium text-white">{obj.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded border"
                              style={{ color: '#818cf8', borderColor: 'rgba(129,140,248,0.3)', background: 'rgba(129,140,248,0.1)' }}>
                              {typeLabel(obj.type)}
                            </span>
                          </div>
                          {obj.deadline && (
                            <p className="text-[11px] text-gray-600">📅 {formatDeadline(obj.deadline)}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold leading-none" style={{ color }}>{p}%</p>
                        </div>
                      </div>

                      {/* Barra */}
                      <div className="h-1.5 rounded-full bg-dark-muted/30 overflow-hidden mb-1">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${p}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)`, boxShadow: `0 0 6px ${color}60` }} />
                      </div>

                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-500">{obj.current_value.toLocaleString('es-CL')} {obj.unit}</span>
                        <span className="text-gray-600">Meta: {obj.target_value.toLocaleString('es-CL')} {obj.unit}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
