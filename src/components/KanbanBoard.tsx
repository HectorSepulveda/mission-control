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
  { key: 'recurring', label: '🔄 Recurring', color: 'border-purple-500/30' },
  { key: 'backlog', label: '📋 Backlog', color: 'border-gray-500/30' },
  { key: 'in_progress', label: '⚡ En Progreso', color: 'border-yellow-500/30' },
  { key: 'review', label: '👀 Revisión', color: 'border-blue-500/30' },
  { key: 'done', label: '✅ Listo', color: 'border-green-500/30' },
]

function priorityColor(priority: number | string): string {
  const p = String(priority)
  switch (p) {
    case '1': case 'high': return 'text-red-400 border-red-400/30 bg-red-400/10'
    case '2': case 'medium': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
    case '3': case 'low': return 'text-gray-400 border-gray-400/30 bg-gray-400/10'
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
    <div className="bg-dark-surface border border-dark-border rounded-lg p-3 text-sm relative group hover:border-brand-green/30 transition-colors">
      <div className="flex items-start justify-between gap-1">
        <p className="font-medium text-white text-xs leading-relaxed flex-1">{task.title}</p>
        <button
          onClick={() => setShowMove(!showMove)}
          className="text-gray-600 hover:text-gray-300 text-lg leading-none flex-shrink-0 -mt-0.5 w-5 text-center"
        >
          ⋮
        </button>
      </div>

      {task.description && (
        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-2 gap-1 flex-wrap">
        {task.priority && (
          <span className={`text-xs border rounded px-1.5 py-0.5 ${priorityColor(task.priority)}`}>
            {priorityLabel(task.priority)}
          </span>
        )}
        {task.project && task.project !== 'general' && (
          <span className="text-xs text-brand-green/70 font-medium">{task.project}</span>
        )}
        {task.assigned_to && (
          <span className="text-xs text-gray-600">{task.assigned_to === 'agent' ? '🤖' : '👤'}</span>
        )}
      </div>

      {showMove && (
        <div className="absolute right-0 top-8 z-20 bg-dark-card border border-dark-border rounded-lg shadow-xl overflow-hidden min-w-[140px]">
          <p className="text-xs text-gray-600 px-3 py-1.5 border-b border-dark-border">Mover a...</p>
          {COLUMNS.map((col) => (
            <button
              key={col.key}
              onClick={() => {
                onMove(task.id, col.key)
                setShowMove(false)
              }}
              className={`block w-full text-left text-xs px-3 py-1.5 hover:bg-dark-muted/30 text-gray-400 hover:text-white whitespace-nowrap ${task.status === col.key ? 'text-brand-green' : ''}`}
            >
              {col.label}
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
    // Optimistic update
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
      {/* Botón Nueva Tarea */}
      <div className="mb-4">
        <button
          onClick={() => setShowNewTask(!showNewTask)}
          className="btn-primary text-sm"
        >
          {showNewTask ? '✕ Cancelar' : '+ Nueva tarea'}
        </button>
      </div>

      {/* Formulario nueva tarea */}
      {showNewTask && (
        <div className="card mb-4 border-brand-green/30">
          <h3 className="text-sm font-semibold text-white mb-3">Nueva Tarea</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Título de la tarea *"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && createTask()}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-green"
              autoFocus
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
                <option value="1">🔴 Alta</option>
                <option value="2">🟡 Media</option>
                <option value="3">🟢 Baja</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createTask}
                disabled={saving || !newTask.title.trim()}
                className="btn-primary text-sm disabled:opacity-50"
              >
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

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key)
          return (
            <div key={col.key} className={`flex-shrink-0 w-56 border rounded-lg p-2 ${col.color} bg-dark-surface/30`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{col.label}</h3>
                <span className="text-xs bg-dark-muted/50 text-gray-500 rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[80px]">
                {colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onMove={moveTask} />
                ))}
                {colTasks.length === 0 && (
                  <div className="border border-dashed border-dark-border/50 rounded-lg h-14 flex items-center justify-center">
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
