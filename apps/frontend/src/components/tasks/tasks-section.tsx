import { useState } from 'react';
import { Star, Package, ClipboardCheck, Plus } from 'lucide-react';
import { Task } from '@/types';
import { Button } from '@/components/ui/button';
import NewTaskDialog from '@/components/tasks/new-tasks-dialog';
import TaskCard from '@/components/tasks/tasks-card';

export default function TaskSection({
  title,
  count,
  tasks,
  variant = 'default',
  onTaskCreated,
  onToggle,
  onDelete,
}: {
  title: string;
  count: number;
  tasks: Task[];
  variant?: 'default' | 'backlog' | 'done';
  onTaskCreated: (title: string, dueDate: string, subtasks: string[]) => Promise<void>;
  onToggle: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const icons = {
    default: <Star height={25} />,
    backlog: <Package height={25} />,
    done: <ClipboardCheck height={25} />,
  };

  const colors = {
    default: 'text-gray-900 dark:text-gray-100',
    backlog: 'text-orange-500 dark:text-orange-400',
    done: 'text-green-600 dark:text-green-500',
  };

  const [openCreateTaskDialog, setOpenCreateTaskDialog] = useState(false);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`ml-4 flex items-center gap-2 text-lg font-semibold ${colors[variant]}`}>
          <span className="mr-1">{icons[variant]}</span>
          <span>{title}</span>
          <span className="ml-1 text-gray-400 dark:text-gray-500 py-1 text-base font-medium">
            {count}
          </span>
        </h3>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full mr-3 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setOpenCreateTaskDialog(true)}
        >
          <Plus className="h-8" />
        </Button>
      </div>
      <div>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </div>
      <NewTaskDialog
        isOpen={openCreateTaskDialog}
        onOpenChange={setOpenCreateTaskDialog}
        onSubmit={onTaskCreated}
      />
    </div>
  );
}
