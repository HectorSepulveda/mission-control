import { query } from '@/lib/db'
import KanbanBoard from '@/components/KanbanBoard'
import NewTaskModal from '@/components/NewTaskModal'

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
    <div className="p-4 md:p-6 max-w-full">
      <div className="flex items-center justify-between mb-4 md:mb-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-white">Tareas ✅</h1>
          <p className="text-sm mt-1 text-gray-500">
            {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} · Astro enruta automáticamente
          </p>
        </div>
        <NewTaskModal project="pettech" />
      </div>
      <KanbanBoard initialTasks={tasks} />
    </div>
  )
}
