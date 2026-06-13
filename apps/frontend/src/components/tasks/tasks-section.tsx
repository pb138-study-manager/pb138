import { useState } from 'react';
import { Star, Package, ClipboardCheck, Plus, AlertCircle, CalendarDays, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { Task } from '@/types';
import { Button } from '@/components/ui/button';
import NewTaskDialog from '@/components/tasks/new-tasks-dialog';
import TaskCard from '@/components/tasks/tasks-card';

type SectionVariant = 'default' | 'backlog' | 'done' | 'overdue' | 'thisWeek' | 'later';

export default function TaskSection({
  title,
  count,
  tasks,
  variant = 'default',
  showBorder = false,
  onTaskCreated,
  onToggle,
  onEditFull,
  onDelete,
}: {
  title: string;
  count: number;
  tasks: Task[];
  variant?: SectionVariant;
  showBorder?: boolean;
  onTaskCreated: (
    title: string,
    dueDate: string | undefined,
    subtasks: string[],
    description?: string,
    courseId?: number,
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null,
    tags?: string[]
  ) => Promise<void>;
  onToggle: (id: number) => Promise<void>;
  onEditFull: (
    id: number,
    data: {
      title: string;
      dueDate?: string;
      description?: string;
      status?: import('@/types').TaskStatus;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
      tags?: string[];
      courseId?: number | null;
    },
    subtasksToAdd: string[],
    subtaskIdsToDelete: number[]
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const icons: Record<SectionVariant, React.ReactNode> = {
    default: <Star height={25} />,
    backlog: <Package height={25} />,
    done: <ClipboardCheck height={25} />,
    overdue: <AlertCircle height={25} />,
    thisWeek: <CalendarDays height={25} />,
    later: <Clock height={25} />,
  };

  const colors: Record<SectionVariant, string> = {
    default: 'text-blue-600 dark:text-blue-400',
    backlog: 'text-orange-500 dark:text-orange-400',
    done: 'text-green-600 dark:text-green-500',
    overdue: 'text-red-500 dark:text-red-400',
    thisWeek: 'text-purple-600 dark:text-purple-400',
    later: 'text-gray-500 dark:text-gray-400',
  };

  const [openCreateTaskDialog, setOpenCreateTaskDialog] = useState(false);
  const [collapsed, setCollapsed] = useState(variant === 'done');

  const borderClass = showBorder
    ? variant === 'backlog'
      ? 'border-2 border-dashed border-orange-200 dark:border-orange-900 rounded-2xl p-3'
      : 'border-2 border-dashed border-blue-200 dark:border-blue-900 rounded-2xl p-3'
    : '';

  return (
    <div className={`mb-6 ${borderClass}`}>
      <div className="flex items-center justify-between mb-4">
        <h3
          className={`ml-4 flex items-center gap-2 text-lg font-semibold cursor-pointer select-none ${colors[variant]}`}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className="mr-1">{icons[variant]}</span>
          <span>{title}</span>
          <span className="ml-1 text-gray-400 dark:text-gray-500 py-1 text-base font-medium">
            {count}
          </span>
        </h3>
        {variant !== 'done' && (
          <Button
            variant="outline"
            size="icon"
            className="rounded-full mr-3 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setOpenCreateTaskDialog(true)}
          >
            <Plus className="h-8" />
          </Button>
        )}
      </div>
      {!collapsed && (
        <div>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={onToggle} onEditFull={onEditFull} onDelete={onDelete} />
          ))}
        </div>
      )}
      <NewTaskDialog
        isOpen={openCreateTaskDialog}
        onOpenChange={setOpenCreateTaskDialog}
        onSubmit={onTaskCreated}
      />
    </div>
  );
}
