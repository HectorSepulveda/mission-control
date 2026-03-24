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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tareas ✅</h1>
          <p className="text-gray-500 mt-1">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''} en total</p>
        </div>
      </div>
      <KanbanBoard initialTasks={tasks} />
    </div>
  )
}
