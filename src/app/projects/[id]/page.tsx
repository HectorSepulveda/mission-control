import { query } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

/* ── Types ───────────────────────────────────────────── */
interface Project {
  id: string
  name: string
  description: string | null
  status: string
  stack: Record<string, boolean> | null
  url: string | null
  github_url: string | null
  admin_url: string | null
  health_score: number | null
  budget_usd: string | null
  kpis: Record<string, unknown> | null
  apis: ApiEntry[] | null
  n8n_workflows: WorkflowEntry[] | null
  created_at: string
  updated_at: string
}

interface ApiEntry {
  name: string
  status: 'ok' | 'warning' | 'error'
  note?: string
}

interface WorkflowEntry {
  id: string
  name: string
  active: boolean
}

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  assigned_to: string | null
  priority: string | null
  created_at: string
}

interface Event {
  id: string
  agent_id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

interface Decision {
  id: string
  agent_id: string
  decision: string
  reasoning: string | null
  created_at: string
}

interface CostData {
  build: string
  operation: string
  build_tokens: string
  operation_tokens: string
}

/* ── Data fetchers ───────────────────────────────────── */
async function getProject(id: string): Promise<Project | null> {
  try {
    const rows = await query<Project>('SELECT * FROM projects WHERE id = $1', [id])
    return rows[0] || null
  } catch {
    return null
  }
}

async function getProjectCosts(projectName: string): Promise<CostData> {
  try {
    const [build, operation] = await Promise.all([
      query<{ total_cost: string; total_tokens: string }>(`
        SELECT COALESCE(SUM(cost_usd), 0) as total_cost,
               COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens
        FROM token_usage WHERE project = $1 AND phase = 'build'
      `, [projectName]),
      query<{ total_cost: string; total_tokens: string }>(`
        SELECT COALESCE(SUM(cost_usd), 0) as total_cost,
               COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens
        FROM token_usage WHERE project = $1 AND phase = 'operation'
      `, [projectName]),
    ])
    return {
      build: build[0]?.total_cost || '0',
      operation: operation[0]?.total_cost || '0',
      build_tokens: build[0]?.total_tokens || '0',
      operation_tokens: operation[0]?.total_tokens || '0',
    }
  } catch {
    return { build: '0', operation: '0', build_tokens: '0', operation_tokens: '0' }
  }
}

async function getProjectTasks(projectId: string): Promise<Task[]> {
  try {
    return await query<Task>(`
      SELECT * FROM tasks WHERE project = $1
      ORDER BY CASE status
        WHEN 'in_progress' THEN 1
        WHEN 'todo' THEN 2
        WHEN 'done' THEN 3
        ELSE 4
      END, priority DESC, created_at DESC
    `, [projectId])
  } catch {
    return []
  }
}

async function getProjectEvents(projectName: string): Promise<Event[]> {
  try {
    return await query<Event>(`
      SELECT * FROM agent_events WHERE project = $1
      ORDER BY created_at DESC LIMIT 20
    `, [projectName])
  } catch {
    return []
  }
}

async function getProjectDecisions(projectName: string): Promise<Decision[]> {
  try {
    return await query<Decision>(`
      SELECT * FROM agent_decisions WHERE project = $1
      ORDER BY created_at DESC LIMIT 10
    `, [projectName])
  } catch {
    return []
  }
}

async function getAgentCount(projectName: string): Promise<number> {
  try {
    const rows = await query<{ count: string }>(`
      SELECT COUNT(DISTINCT agent_id) as count
      FROM agent_events WHERE project = $1
    `, [projectName])
    return parseInt(rows[0]?.count || '0')
  } catch {
    return 0
  }
}

async function getCompletedTasksCount(projectId: string): Promise<number> {
  try {
    const rows = await query<{ count: string }>(`
      SELECT COUNT(*) as count FROM tasks
      WHERE project = $1 AND status = 'done'
    `, [projectId])
    return parseInt(rows[0]?.count || '0')
  } catch {
    return 0
  }
}

/* ── Helpers ─────────────────────────────────────────── */
function formatCLP(usd: number): string {
  return Math.round(usd * 950).toLocaleString('es-CL')
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

function daysActive(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
}

function healthColor(score: number | null): string {
  if (score === null || score === undefined) return '#64748b'
  if (score >= 80) return '#4ade80'
  if (score >= 50) return '#fbbf24'
  return '#f87171'
}

function statusConfig(status: string) {
  switch (status?.toLowerCase()) {
    case 'active': return { label: 'Activo', color: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' }
    case 'paused': return { label: 'Pausado', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' }
    default: return { label: status || 'Sin estado', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' }
  }
}

function taskStatusConfig(status: string) {
  switch (status?.toLowerCase()) {
    case 'done': return { label: 'Done', color: '#4ade80', bg: 'rgba(34,197,94,0.1)' }
    case 'in_progress': return { label: 'En progreso', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' }
    case 'todo': return { label: 'Por hacer', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
    default: return { label: status, color: '#64748b', bg: 'rgba(100,116,139,0.1)' }
  }
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
  if (t.includes('shopify')) return '🛍️'
  return '🔧'
}

function apiStatusDot(status: string): string {
  switch (status) {
    case 'ok': return '#4ade80'
    case 'warning': return '#fbbf24'
    case 'error': return '#f87171'
    default: return '#64748b'
  }
}

function getProjectHeaderGradient(name: string): string {
  const lname = name.toLowerCase()
  if (lname.includes('pet')) return 'linear-gradient(135deg, rgba(26,107,60,0.7) 0%, rgba(34,197,94,0.2) 60%, transparent 100%)'
  if (lname.includes('bot') || lname.includes('trad')) return 'linear-gradient(135deg, rgba(29,78,216,0.7) 0%, rgba(96,165,250,0.2) 60%, transparent 100%)'
  return 'linear-gradient(135deg, rgba(124,58,237,0.7) 0%, rgba(167,139,250,0.2) 60%, transparent 100%)'
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{icon}</span>
      <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>{title}</h2>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id)

  if (!project) {
    notFound()
  }

  const [costs, tasks, events, decisions, agentCount, completedTasks] = await Promise.all([
    getProjectCosts(project.name),
    getProjectTasks(project.id),
    getProjectEvents(project.name),
    getProjectDecisions(project.name),
    getAgentCount(project.name),
    getCompletedTasksCount(project.id),
  ])

  const status = statusConfig(project.status)
  const hColor = healthColor(project.health_score)
  const headerGradient = getProjectHeaderGradient(project.name)
  const stackTags = project.stack
    ? Object.entries(project.stack).filter(([, v]) => v === true).map(([k]) => k)
    : []

  const buildCost = parseFloat(costs.build)
  const operationCost = parseFloat(costs.operation)
  const buildTokens = parseInt(costs.build_tokens)
  const operationTokens = parseInt(costs.operation_tokens)
  const days = daysActive(project.created_at)

  // Group tasks
  const taskGroups = {
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    todo: tasks.filter(t => t.status === 'todo'),
    done: tasks.filter(t => t.status === 'done'),
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Hero Header ──────────────────────────────────── */}
      <div
        className="relative px-5 md:px-8 pt-6 pb-8 mb-6"
        style={{ background: headerGradient }}
      >
        {/* Back button */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs mb-4 hover:opacity-80 transition-opacity"
          style={{ color: '#94a3b8' }}
        >
          ← Proyectos
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: '#f1f5f9' }}>
                {project.name}
              </h1>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ color: status.color, background: status.bg, border: `1px solid ${status.border}` }}
              >
                {status.label}
              </span>
            </div>

            {project.description && (
              <p className="mt-2 text-sm" style={{ color: '#94a3b8' }}>{project.description}</p>
            )}

            {/* Links */}
            <div className="flex flex-wrap gap-2 mt-3">
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}
                >
                  🔗 Sitio web
                </a>
              )}
              {project.github_url && (
                <a
                  href={project.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}
                >
                  🐙 GitHub
                </a>
              )}
              {project.admin_url && (
                <a
                  href={project.admin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}
                >
                  ⚙️ Admin
                </a>
              )}
            </div>
          </div>

          {/* Health score circle */}
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-16 h-16 rounded-full flex flex-col items-center justify-center"
              style={{
                background: `${hColor}15`,
                border: `3px solid ${hColor}`,
                boxShadow: `0 0 20px ${hColor}30`,
              }}
            >
              <span className="text-lg font-extrabold" style={{ color: hColor }}>
                {project.health_score ?? '—'}
              </span>
            </div>
            <span className="text-[10px] text-center" style={{ color: '#64748b' }}>Health</span>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-8 space-y-6">

        {/* ── Overview grid ────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <OverviewCard icon="📅" label="Lanzamiento" value={new Date(project.created_at).toLocaleDateString('es-CL')} />
          <OverviewCard icon="⏱️" label="Días activo" value={days.toString()} sub="días" />
          <OverviewCard icon="✅" label="Tareas completadas" value={completedTasks.toString()} />
          <OverviewCard icon="🤖" label="Agentes activos" value={agentCount.toString()} sub="en total" />
        </div>

        {/* ── Costos ───────────────────────────────────────── */}
        <div>
          <SectionHeader title="Costos de IA" icon="💸" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CostCard
              title="🏗️ Build"
              costUsd={buildCost}
              tokens={buildTokens}
              color="#818cf8"
            />
            <CostCard
              title="⚙️ Operación"
              costUsd={operationCost}
              tokens={operationTokens}
              color="#34d399"
            />
          </div>
          <div
            className="mt-3 p-3 rounded-xl text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-xs" style={{ color: '#64748b' }}>Total invertido: </span>
            <span className="text-sm font-bold" style={{ color: '#f1f5f9' }}>
              ${(buildCost + operationCost).toFixed(4)} USD
            </span>
            <span className="text-xs ml-2" style={{ color: '#64748b' }}>
              (${formatCLP(buildCost + operationCost)} CLP)
            </span>
          </div>
        </div>

        {/* ── Infraestructura ──────────────────────────────── */}
        {stackTags.length > 0 && (
          <div>
            <SectionHeader title="Stack Tecnológico" icon="🏗️" />
            <div className="flex flex-wrap gap-2">
              {stackTags.map((tech) => (
                <span
                  key={tech}
                  className="text-xs font-medium px-3 py-2 rounded-xl flex items-center gap-1.5"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#cbd5e1',
                  }}
                >
                  {stackEmoji(tech)} {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── APIs & Plataformas ───────────────────────────── */}
        {project.apis && Array.isArray(project.apis) && project.apis.length > 0 && (
          <div>
            <SectionHeader title="APIs & Plataformas" icon="🔌" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(project.apis as ApiEntry[]).map((api, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: apiStatusDot(api.status) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>{api.name}</p>
                    {api.note && (
                      <p className="text-[10px] truncate mt-0.5" style={{ color: '#64748b' }}>{api.note}</p>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      color: apiStatusDot(api.status),
                      background: `${apiStatusDot(api.status)}18`,
                    }}
                  >
                    {api.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Workflows n8n ────────────────────────────────── */}
        {project.n8n_workflows && Array.isArray(project.n8n_workflows) && project.n8n_workflows.length > 0 && (
          <div>
            <SectionHeader title="Workflows n8n" icon="⚡" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(project.n8n_workflows as WorkflowEntry[]).map((wf, i) => (
                <a
                  key={i}
                  href={`https://n8n-nfd9.srv1514641.hstgr.cloud/workflow/${wf.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: wf.active ? '#4ade80' : '#64748b' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>{wf.name}</p>
                    <p className="text-[10px]" style={{ color: '#475569' }}>ID: {wf.id}</p>
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: wf.active ? '#4ade80' : '#64748b' }}
                  >
                    {wf.active ? '● Activo' : '○ Inactivo'}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Tareas ───────────────────────────────────────── */}
        <div>
          <SectionHeader title="Tareas" icon="📋" />
          {tasks.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: '#475569' }}>Sin tareas registradas</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(taskGroups)
                .filter(([, list]) => list.length > 0)
                .map(([groupStatus, list]) => {
                  const tStatus = taskStatusConfig(groupStatus)
                  return (
                    <div key={groupStatus}>
                      <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: tStatus.color }}>
                        {tStatus.label} ({list.length})
                      </p>
                      <div className="space-y-2">
                        {list.map((task) => (
                          <div
                            key={task.id}
                            className="p-3 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium" style={{ color: '#e2e8f0' }}>{task.title}</p>
                                {task.description && (
                                  <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: '#64748b' }}>
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              {task.priority && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                                  style={{
                                    color: task.priority === 'high' ? '#f87171' : task.priority === 'medium' ? '#fbbf24' : '#94a3b8',
                                    background: task.priority === 'high' ? 'rgba(248,113,113,0.1)' : task.priority === 'medium' ? 'rgba(251,191,36,0.1)' : 'rgba(148,163,184,0.1)',
                                  }}
                                >
                                  {task.priority}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* ── Activity feed ────────────────────────────────── */}
        <div>
          <SectionHeader title="Actividad del Proyecto" icon="📡" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Events */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>Eventos ({events.length})</p>
              {events.length === 0 ? (
                <p className="text-xs py-4 text-center" style={{ color: '#475569' }}>Sin eventos</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="p-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{
                            color: event.event_type === 'error' ? '#f87171' : event.event_type === 'success' ? '#4ade80' : '#818cf8',
                            background: event.event_type === 'error' ? 'rgba(248,113,113,0.1)' : 'rgba(129,140,248,0.1)',
                          }}
                        >
                          {event.event_type}
                        </span>
                        <span className="text-[10px]" style={{ color: '#475569' }}>{event.agent_id}</span>
                      </div>
                      <p className="text-[10px]" style={{ color: '#64748b' }}>{timeAgo(event.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Decisions */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>Decisiones ({decisions.length})</p>
              {decisions.length === 0 ? (
                <p className="text-xs py-4 text-center" style={{ color: '#475569' }}>Sin decisiones</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {decisions.map((dec) => (
                    <div
                      key={dec.id}
                      className="p-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <p className="text-xs font-medium" style={{ color: '#e2e8f0' }}>{dec.decision}</p>
                      {dec.reasoning && (
                        <p className="text-[10px] mt-1 line-clamp-2" style={{ color: '#64748b' }}>{dec.reasoning}</p>
                      )}
                      <p className="text-[10px] mt-1" style={{ color: '#475569' }}>{dec.agent_id} · {timeAgo(dec.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────── */
function OverviewCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div
      className="card text-center"
      style={{ padding: '1rem' }}
    >
      <span className="text-2xl">{icon}</span>
      <p className="text-[10px] uppercase tracking-wide mt-1 mb-1" style={{ color: '#64748b' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: '#f1f5f9' }}>{value}</p>
      {sub && <p className="text-[10px]" style={{ color: '#475569' }}>{sub}</p>}
    </div>
  )
}

function CostCard({ title, costUsd, tokens, color }: { title: string; costUsd: number; tokens: number; color: string }) {
  return (
    <div
      className="card"
      style={{ borderColor: `${color}30` }}
    >
      <p className="text-sm font-semibold mb-3" style={{ color: '#f1f5f9' }}>{title}</p>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: '#64748b' }}>USD</span>
          <span className="text-sm font-bold" style={{ color }}>${costUsd.toFixed(4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: '#64748b' }}>CLP</span>
          <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>${formatCLP(costUsd)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: '#64748b' }}>Tokens</span>
          <span className="text-xs font-semibold" style={{ color: '#64748b' }}>{formatNumber(tokens)}</span>
        </div>
      </div>
    </div>
  )
}
