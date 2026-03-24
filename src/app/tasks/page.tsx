import KanbanBoard from '@/components/KanbanBoard'

export const dynamic = 'force-dynamic'

export default function TasksPage() {
  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tareas ✅</h1>
          <p className="text-gray-500 mt-1">Kanban board</p>
        </div>
      </div>
      <KanbanBoard />
    </div>
  )
}
