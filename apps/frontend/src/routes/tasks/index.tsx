import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Task } from '@/types';
import TaskSection from '@/components/tasks/tasks-section';
import TaskSidebar from '@/components/tasks/tasks-sidebar';
import { api } from '@/lib/api';

export const Route = createFileRoute('/tasks/')({
  component: TasksPage,
});

function splitTasks(tasks: Task[]) {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const today: Task[] = [];
  const backlog: Task[] = [];
  const done: Task[] = [];

  for (const task of tasks) {
    if (task.status === 'DONE') {
      done.push(task);
    } else if (new Date(task.dueDate) <= todayEnd) {
      today.push(task);
    } else {
      backlog.push(task);
    }
  }

  return { today, backlog, done };
}

export function TasksPage() {
  const [activeFilter, setActiveFilter] = useState('today');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Task[]>('/tasks')
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(title: string, dueDate: string) {
    const newTask = await api.post<Task>('/tasks', { title, dueDate });
    setTasks((prev) => [...prev, newTask]);
  }

  async function handleToggle(id: number) {
    const updated = await api.patch<Task>(`/tasks/${id}/toggle-done`, {});
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function handleDelete(id: number) {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const { today, backlog, done } = splitTasks(tasks);

  const counts = {
    today: today.length,
    backlog: backlog.length,
    done: done.length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-8">
          <TaskSidebar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
          />
          <div className="flex-1" />
        </div>

        <div>
          <TaskSection
            title="Today"
            count={counts.today}
            tasks={today}
            variant="default"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
          <TaskSection
            title="Backlog"
            count={counts.backlog}
            tasks={backlog}
            variant="backlog"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
          <TaskSection
            title="Done"
            count={counts.done}
            tasks={done}
            variant="done"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
