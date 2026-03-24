'use client'

import { useState } from 'react'

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: number | string
  assigned_to: string
  project: string
  created_at: string
}

const COLUMNS = [
  { key: 'recurring', label: 'Recurring', icon: '🔄', borderColor: 'rgba(139,92,246,0.4)', badgeBg: 'rgba(139,92,246,0.12)', badgeColor: '#a78bfa' },
  { key: 'backlog', label: 'Backlog', icon: '📋', borderColor: 'rgba(100,116,139,0.4)', badgeBg: 'rgba(100,116,139,0.1)', badgeColor: '#94a3b8' },
  { key: 'in_progress', label: 'En Progreso', icon: '⚡', borderColor: 'rgba(234,179,8,0.4)', badgeBg: 'rgba(234,179,8,0.1)', badgeColor: '#facc15' },
  { key: 'review', label: 'Revisión', icon: '👀', borderColor: 'rgba(59,130,246,0.4)', badgeBg: 'rgba(59,130,246,0.1)', badgeColor: '#60a5fa' },
  { key: 'done', label: 'Listo', icon: '✅', borderColor: 'rgba(34,197,94,0.4)', badgeBg: 'rgba(34,197,94,0.1)', badgeColor: '#4ade80' },
]

function priorityStyle(priority: number | string) {
  const p = String(priority)
  switch (p) {
    case '1': case 'high':
      return { color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', label: 'Alta' }
    case '2': case 'medium':
      return { color: '#facc15', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.25)', label: 'Media' }
    case '3': case 'low':
      return { color: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', label: 'Baja' }
    default:
      return { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)', label: p }
  }
}

function TaskCard({ task, onMove }: { task: Task; onMove: (id: string, status: string) => void }) {
  const [showMove, setShowMove] = useState(false)
  const pStyle = priorityStyle(task.priority)

  return (
    <div
      className="relative group rounded-xl p-3 text-sm transition-all"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(255,255,255,0.12)'
        el.style.transform = 'translateY(-1px)'
        el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(255,255,255,0.07)'
        el.style.transform = ''
        el.style.boxShadow = ''
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-medium text-xs leading-relaxed flex-1" style={{ color: '#e2e8f0' }}>
          {task.title}
        </p>
        <button
          onClick={() => setShowMove(!showMove)}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -mt-0.5 w-5 text-center rounded text-base leading-none"
          style={{ color: '#64748b' }}
        >
          ⋮
        </button>
      </div>

      {task.description && (
        <p className="text-[10px] mt-1 line-clamp-2" style={{ color: '#475569' }}>
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {task.priority && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ color: pStyle.color, background: pStyle.bg, border: `1px solid ${pStyle.border}` }}
          >
            {pStyle.label}
          </span>
        )}
        {task.project && task.project !== 'general' && (
          <span className="text-[10px] font-medium" style={{ color: '#22c55e' }}>
            {task.project}
          </span>
        )}
        {task.assigned_to && (
          <span className="text-[10px]" style={{ color: '#475569' }}>
            {task.assigned_to === 'agent' ? '🤖' : '👤'}
          </span>
        )}
      </div>

      {/* Move dropdown */}
      {showMove && (
        <div
          className="absolute right-0 top-8 z-20 rounded-xl shadow-2xl overflow-hidden min-w-[150px]"
          style={{ background: '#0d0d10', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-[10px] px-3 py-2" style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            Mover a...
          </p>
          {COLUMNS.map((col) => (
            <button
              key={col.key}
              onClick={() => { onMove(task.id, col.key); setShowMove(false) }}
              className="flex items-center gap-2 w-full text-left text-xs px-3 py-2 transition-colors"
              style={{
                color: task.status === col.key ? col.badgeColor : '#94a3b8',
                background: 'transparent',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span>{col.icon}</span>
              <span>{col.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function KanbanBoard({ initialTasks = [] }: { initialTasks?: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'backlog', priority: '2' })
  const [saving, setSaving] = useState(false)

  async function moveTask(id: string, status: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch (e) {
      console.error('moveTask error:', e)
    }
  }

  async function createTask() {
    if (!newTask.title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, priority: parseInt(newTask.priority) }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const created = await res.json()
      setTasks((prev) => [created, ...prev])
      setNewTask({ title: '', description: '', status: 'backlog', priority: '2' })
      setShowNewTask(false)
    } catch (e) {
      console.error('createTask error:', e)
      alert('Error al crear tarea. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* New Task Button */}
      <div className="mb-5">
        <button
          onClick={() => setShowNewTask(!showNewTask)}
          className="btn-primary"
        >
          {showNewTask ? (
            <><span>✕</span> Cancelar</>
          ) : (
            <><span>+</span> Nueva tarea</>
          )}
        </button>
      </div>

      {/* New Task Form */}
      {showNewTask && (
        <div className="card mb-5" style={{ borderColor: 'rgba(26,107,60,0.35)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>Nueva Tarea</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Título de la tarea *"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && createTask()}
              className="w-full rounded-xl px-3 py-2.5 text-sm transition-colors"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#f1f5f9',
                outline: 'none',
              }}
              onFocus={(e) => { (e.target as HTMLElement).style.borderColor = 'rgba(26,107,60,0.5)' }}
              onBlur={(e) => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
              autoFocus
            />
            <textarea
              placeholder="Descripción (opcional)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#f1f5f9',
                outline: 'none',
              }}
              onFocus={(e) => { (e.target as HTMLElement).style.borderColor = 'rgba(26,107,60,0.5)' }}
              onBlur={(e) => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
            />
            <div className="flex gap-3">
              <select
                value={newTask.status}
                onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f1f5f9',
                  outline: 'none',
                }}
              >
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key} style={{ background: '#0d0d10' }}>{c.icon} {c.label}</option>
                ))}
              </select>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f1f5f9',
                  outline: 'none',
                }}
              >
                <option value="1" style={{ background: '#0d0d10' }}>🔴 Alta</option>
                <option value="2" style={{ background: '#0d0d10' }}>🟡 Media</option>
                <option value="3" style={{ background: '#0d0d10' }}>🟢 Baja</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createTask}
                disabled={saving || !newTask.title.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Crear tarea'}
              </button>
              <button
                onClick={() => setShowNewTask(false)}
                className="text-sm px-4 py-2 rounded-xl transition-all"
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#94a3b8',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLElement).style.color = '#f1f5f9' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key)
          return (
            <div
              key={col.key}
              className="flex-shrink-0 w-60 rounded-2xl p-3"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${col.borderColor}`,
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{col.icon}</span>
                  <h3 className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
                    {col.label}
                  </h3>
                </div>
                <span
                  className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: col.badgeBg, color: col.badgeColor }}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="space-y-2 min-h-[80px]">
                {colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onMove={moveTask} />
                ))}
                {colTasks.length === 0 && (
                  <div
                    className="rounded-xl h-14 flex items-center justify-center"
                    style={{ border: '1px dashed rgba(255,255,255,0.06)' }}
                  >
                    <span className="text-[10px]" style={{ color: '#334155' }}>Vacío</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
