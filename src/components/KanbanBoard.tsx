'use client'

import { useEffect, useState } from 'react'

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
  { key: 'recurring', label: '🔄 Recurring' },
  { key: 'backlog', label: '📋 Backlog' },
  { key: 'in_progress', label: '⚡ In Progress' },
  { key: 'review', label: '👀 Review' },
  { key: 'done', label: '✅ Done' },
]

function priorityColor(priority: number | string): string {
  const p = String(priority)
  switch (p) {
    case '1': case 'high': case 'alta': return 'text-red-400 border-red-400/30'
    case '2': case 'medium': case 'media': return 'text-yellow-400 border-yellow-400/30'
    case '3': case 'low': case 'baja': return 'text-gray-400 border-gray-400/30'
    default: return 'text-gray-500 border-gray-500/30'
  }
}
function priorityLabel(priority: number | string): string {
  const p = String(priority)
  switch (p) {
    case '1': return '🔴 Alta'
    case '2': return '🟡 Media'
    case '3': return '🟢 Baja'
    default: return p
  }
}

function TaskCard({ task, onMove }: { task: Task; onMove: (id: string, status: string) => void }) {
  const [showMove, setShowMove] = useState(false)

  return (
    <div className="bg-dark-surface border border-dark-border rounded-lg p-3 text-sm relative group">
      <div className="flex items-start justify-between gap-1">
        <p className="font-medium text-white text-xs leading-relaxed">{task.title}</p>
        <button
          onClick={() => setShowMove(!showMove)}
          className="text-gray-600 hover:text-gray-400 text-lg leading-none flex-shrink-0 -mt-0.5"
        >
          ⋮
        </button>
      </div>

      {task.description && (
        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        {task.priority && (
          <span className={`text-xs border rounded px-1 ${priorityColor(task.priority)}`}>
            {priorityLabel(task.priority)}
          </span>
        )}
        {task.assigned_to && (
          <span className="text-xs text-gray-600 truncate max-w-[80px]">{task.assigned_to}</span>
        )}
      </div>

      {showMove && (
        <div className="absolute right-0 top-8 z-10 bg-dark-card border border-dark-border rounded-lg shadow-xl overflow-hidden">
          {COLUMNS.map((col) => (
            <button
              key={col.key}
              onClick={() => {
                onMove(task.id, col.key)
                setShowMove(false)
              }}
              className="block w-full text-left text-xs px-3 py-1.5 hover:bg-dark-muted/30 text-gray-400 hover:text-white whitespace-nowrap"
            >
              {col.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'backlog', priority: 'medium' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [])

  // Usa URL absoluta para funcionar en Next.js standalone
  const apiBase = typeof window !== 'undefined' ? window.location.origin : ''

  async function fetchTasks() {
    try {
      const res = await fetch(`${apiBase}/api/tasks`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTasks(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('fetchTasks error:', e)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  async function moveTask(id: string, status: string) {
    try {
      await fetch(`${apiBase}/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
    } catch (e) {
      console.error('moveTask error:', e)
    }
  }

  async function createTask() {
    if (!newTask.title.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`${apiBase}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const created = await res.json()
      setTasks((prev) => [created, ...prev])
      setNewTask({ title: '', description: '', status: 'backlog', priority: 'medium' })
      setShowNewTask(false)
    } catch (e) {
      console.error('createTask error:', e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500 text-sm py-8 text-center">Cargando tareas...</div>
  }

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => setShowNewTask(!showNewTask)} className="btn-primary text-sm">
          + Nueva tarea
        </button>
      </div>

      {showNewTask && (
        <div className="card mb-4 border-brand-green/30">
          <h3 className="text-sm font-semibold text-white mb-3">Nueva Tarea</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Título de la tarea *"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-green"
            />
            <textarea
              placeholder="Descripción (opcional)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              rows={2}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-green resize-none"
            />
            <div className="flex gap-3">
              <select
                value={newTask.status}
                onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green"
              >
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green"
              >
                <option value="low">🟢 Baja</option>
                <option value="medium">🟡 Media</option>
                <option value="high">🔴 Alta</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={createTask} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Guardando...' : 'Crear tarea'}
              </button>
              <button
                onClick={() => setShowNewTask(false)}
                className="text-sm px-4 py-2 border border-dark-border rounded-lg text-gray-400 hover:text-white hover:border-dark-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key)
          return (
            <div key={col.key} className="flex-shrink-0 w-60">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{col.label}</h3>
                <span className="text-xs bg-dark-muted/30 text-gray-500 rounded-full w-5 h-5 flex items-center justify-center">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onMove={moveTask} />
                ))}
                {colTasks.length === 0 && (
                  <div className="border border-dashed border-dark-border rounded-lg h-16 flex items-center justify-center">
                    <span className="text-xs text-gray-700">Vacío</span>
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
