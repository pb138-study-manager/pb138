import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Task, TaskStatus } from '@/types';
import BottomNav from '@/components/ui/bottom-nav';
import TaskSection from '@/components/tasks/tasks-section';
import TaskSidebar from '@/components/tasks/tasks-sidebar';
import FeaturedTaskCard from '@/components/tasks/featured-tasks-card';
import { FeaturedTaskItem } from '@/types';

export const Route = createFileRoute('/tasks/')({
  component: TasksPage,
});

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
        <div className="flex gap-2 mb-8">
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
