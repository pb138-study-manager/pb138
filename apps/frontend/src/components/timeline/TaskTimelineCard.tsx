import { useState } from 'react'
import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Task, TaskStatus } from '@/types'
import EditTaskDialog from '@/components/tasks/edit-task-dialog'

interface TaskTimelineCardProps {
  task: Task
  timeLabel: string
  onToggle: () => void
  onEditFull: (
    id: number,
    data: { title: string; dueDate: string; description?: string; status?: TaskStatus },
    subtasksToAdd: string[],
    subtaskIdsToDelete: number[]
  ) => Promise<void>
}

export function TaskTimelineCard({ task, timeLabel, onToggle, onEditFull }: TaskTimelineCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const isDone = task.status === 'DONE'

  return (
    <>
      <div className="flex items-stretch gap-3">
        <span className="text-[11px] font-semibold text-gray-400 w-16 pt-4 shrink-0 text-right">{timeLabel}</span>
        <div className="w-1.5 shrink-0" />
        <Card
          className={`flex-1 border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl transition-opacity ${isDone ? 'opacity-40' : ''}`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-xl shrink-0">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0" onClick={() => setEditOpen(true)}>
              <p className={`font-bold text-sm truncate cursor-pointer ${isDone ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                {task.title}
              </p>
              <p className="text-[13px] text-gray-400 mt-0.5">{timeLabel}</p>
            </div>
            <button onClick={onToggle} className="shrink-0 ml-1">
              {isDone ? (
                <div className="w-7 h-7 rounded-full border-2 border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-500" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full border-2 border-gray-300 dark:border-gray-600" />
              )}
            </button>
          </CardContent>
        </Card>
      </div>

      <EditTaskDialog
        task={task}
        isOpen={editOpen}
        onOpenChange={setEditOpen}
        onSave={(data) => onEditFull(task.id, data, data.subtasksToAdd, data.subtaskIdsToDelete)}
      />
    </>
  )
}
