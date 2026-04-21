import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import {
  Clock,
  Users,
  Plus,
  Star,
  Package,
  ClipboardCheck,
} from 'lucide-react';
import { Task, TaskStatus } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/ui/bottom-nav';
import CreateTaskDialog from '@/components/tasks/new-tasks-dialog';

export const Route = createFileRoute('/tasks/')({
  component: TasksPage,
});

interface FeaturedTaskItem {
  id: number;
  title: string;
  time: string;
  location: string;
  color: 'yellow' | 'green';
}

const FEATURED_TASKS: FeaturedTaskItem[] = [
  {
    id: 1,
    title: 'PB138 — Team standup',
    time: 'Today, 4:00 PM · Online',
    location: 'Online',
    color: 'yellow',
  },
  {
    id: 2,
    title: 'PB111 — Lab submission',
    time: 'Today, 11:59 PM · Moodle',
    location: 'Moodle',
    color: 'green',
  },
];



const TASKS_DATA = {
  today: [
    {
      id: 1,
      userId: 1,
      assignmentId: null,
      title: 'Task...',
      description: 'Subject',
      dueDate: '2023-12-31T23:59:00.000Z',
      status: 'TODO' as TaskStatus,
      deletedAt: null,
    },
    {
      id: 2,
      userId: 1,
      assignmentId: null,
      title: 'Task...',
      description: 'Subject',
      dueDate: '2023-12-31T23:59:00.000Z',
      status: 'IN PROGRESS' as TaskStatus,
      deletedAt: null,
    },
    {
      id: 3,
      userId: 1,
      assignmentId: null,
      title: 'Task...',
      description: 'Subject',
      dueDate: '2023-12-31T23:59:00.000Z',
      status: 'TODO' as TaskStatus,
      deletedAt: null,
    },
  ] as Task[],
  backlog: [
    {
      id: 4,
      userId: 1,
      assignmentId: null,
      title: 'Task...',
      description: 'Subject',
      dueDate: '2023-12-31T23:59:00.000Z',
      status: 'TODO' as TaskStatus,
      deletedAt: null,
    },
    {
      id: 5,
      userId: 1,
      assignmentId: null,
      title: 'Task...',
      description: 'Subject',
      dueDate: '2023-12-31T23:59:00.000Z',
      status: 'TODO' as TaskStatus,
      deletedAt: null,
    },
    {
      id: 6,
      userId: 1,
      assignmentId: null,
      title: 'Task...',
      description: 'Subject',
      dueDate: '2023-12-31T23:59:00.000Z',
      status: 'TODO' as TaskStatus,
      deletedAt: null,
    },
  ] as Task[],
  done: [
    {
      id: 7,
      userId: 1,
      assignmentId: null,
      title: 'Task...',
      description: 'Subject',
      dueDate: '2023-12-31T23:59:00.000Z',
      status: 'DONE' as TaskStatus,
      deletedAt: null,
    },
    {
      id: 8,
      userId: 1,
      assignmentId: null,
      title: 'Task...',
      description: 'Subject',
      dueDate: '2023-12-31T23:59:00.000Z',
      status: 'DONE' as TaskStatus,
      deletedAt: null,
    },
    {
      id: 9,
      userId: 1,
      assignmentId: null,
      title: 'Task...',
      description: 'Subject',
      dueDate: '2023-12-31T23:59:00.000Z',
      status: 'DONE' as TaskStatus,
      deletedAt: null,
    },
  ] as Task[],
};

function FeaturedTaskCard({ task }: { task: FeaturedTaskItem }) {
  const bgColor = task.color === 'yellow' ? 'bg-yellow-100' : 'bg-green-500';
  const borderColor = task.color === 'yellow' ? 'border-yellow-300' : 'border-green-600';
  const textColor = task.color === 'yellow' ? 'text-gray-900' : 'text-white';
  const timeColor = task.color === 'yellow' ? 'text-gray-600' : 'text-green-100';

  return (
    <div
      className={`${bgColor} border-l-4 ${borderColor} rounded-xl p-4 mb-3 flex items-start gap-3 shadow-sm`}
    >
      <div
        className={`w-1 rounded-full flex-shrink-0 ${task.color === 'yellow' ? 'bg-yellow-400' : 'bg-green-400'}`}
      />
      <div className="flex-1">
        <h3 className={`font-semibold text-sm ${textColor}`}>{task.title}</h3>
        <p className={`text-xs ${timeColor} mt-1 flex items-center gap-1`}>
          <Clock className="w-3 h-3" />
          {task.time}
        </p>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const [isChecked, setIsChecked] = useState(task.status === 'DONE');
  const dueTime = `Due ${new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const subject = task.description || 'No description';
  const progress = task.status === 'DONE' ? 4 : task.status === 'IN PROGRESS' ? 2 : 1;
  const maxProgress = 4;
  const hasUsers = task.assignmentId !== null;
  const progressPercent = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2 flex items-start gap-3 hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 truncate">{task.title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          {hasUsers && <Users className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
          <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500 truncate">
            {dueTime} · {subject}
          </p>
        </div>
        {maxProgress > 0 && (
          <div className="mt-1.5">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-blue-500 font-medium mt-0.5 block">
              {progress}/{maxProgress}
            </span>
          </div>
        )}
      </div>
      <div className="flex mt-5 items-center">
        <Checkbox
          checked={isChecked}
          onCheckedChange={(checked) => setIsChecked(checked as boolean)}
          className={`flex-shrink-0 w-7 h-7 rounded-full transition-all cursor-pointer ${
            isChecked
              ? 'bg-green-500 border-green-500'
              : 'bg-white border-gray-300 hover:border-gray-400'
          }`}
        />
      </div>
    </div>
  );
}

function TaskSection({
  title,
  count,
  tasks,
  variant = 'default',
}: {
  title: string;
  count: number;
  tasks: Task[];
  variant?: 'default' | 'backlog' | 'done';
}) {
  const icons = {
    default: <Star height={25} />,
    backlog: <Package height={25} />,
    done: <ClipboardCheck height={25} />,
  };

  const colors = {
    default: 'text-gray-900',
    backlog: 'text-orange-500',
    done: 'text-green-600',
  };

  const [openCreateTaskDialog, setOpenCreateTaskDialog] = useState(false);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`ml-4 flex items-center gap-2 text-lg font-semibold ${colors[variant]}`}>
          <span className="mr-1">{icons[variant]}</span>
          <span>{title}</span>
          <span className="ml-1 text-gray-400 py-1 text-base font-medium">{count}</span>
        </h3>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full mr-3"
          onClick={() => setOpenCreateTaskDialog(true)}
        >
          <Plus className="h-8" />
        </Button>
      </div>
      <div>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
      <CreateTaskDialog isOpen={openCreateTaskDialog} onOpenChange={setOpenCreateTaskDialog} />
    </div>
  );
}

function TaskSidebar({
  counts,
}: {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: { today: number; backlog: number; done: number };
}) {
  return (
    <div className="w-48 pr-6">
      <div className="mb-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Tasks{' '}
          <span className="text-2xl text-gray-400">
            {counts.today + counts.backlog + counts.done}
          </span>
        </h2>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex items-baseline gap-2 border-l-4 border-blue-600 pl-3">
            <span className="text-2xl font-bold text-blue-600">{counts.today}</span>
            <span className="text-gray-600 font-medium">today</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2 border-l-4 border-orange-500 pl-3">
            <span className="text-2xl font-bold text-orange-500">{counts.backlog}</span>
            <span className="text-gray-600 font-medium">Back log</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2 border-l-4 border-green-600 pl-3">
            <span className="text-2xl font-bold text-green-600">{counts.done}</span>
            <span className="text-gray-600 font-medium">done</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TasksPage() {
  const [activeFilter, setActiveFilter] = useState('today');

  const counts = {
    today: 4,
    backlog: 3,
    done: 3,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Tasks with Sidebar */}
        <div className="flex gap-8 mb-8">
          <TaskSidebar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
          />

          <div className="flex-1">
            {/* Featured Tasks */}
            <div>
              {FEATURED_TASKS.map((task) => (
                <FeaturedTaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        </div>

        {/* Task Sections - Full Width */}
        <div>
          <TaskSection
            title="Today"
            count={counts.today}
            tasks={TASKS_DATA.today}
            variant="default"
          />
          <TaskSection
            title="Backlog"
            count={counts.backlog}
            tasks={TASKS_DATA.backlog}
            variant="backlog"
          />
          <TaskSection title="Done" count={counts.done} tasks={TASKS_DATA.done} variant="done" />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
