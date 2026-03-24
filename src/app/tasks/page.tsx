import { query } from '@/lib/db'
import KanbanBoard from '@/components/KanbanBoard'

export const dynamic = 'force-dynamic'

interface Task {
  id: string
  title: string
  description: string
  status: string
  assigned_to: string
  project: string
  priority: number
  created_at: string
  updated_at: string
}

async function getTasks(): Promise<Task[]> {
  try {
    return await query<Task>('SELECT * FROM tasks ORDER BY created_at DESC')
  } catch (e) {
    console.error('getTasks error:', e)
    return []
  }
}

export default async function TasksPage() {
  const tasks = await getTasks()

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6 animate-fade-up">
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
            Tareas
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} en total
          </p>
        </div>
      </div>
      <KanbanBoard initialTasks={tasks} />
    </div>
  )
}
