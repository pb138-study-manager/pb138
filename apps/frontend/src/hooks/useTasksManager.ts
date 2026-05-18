import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Task, TaskStatus } from '@/types';

function splitTasks(tasks: Task[]) {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(todayEnd); weekEnd.setDate(weekEnd.getDate() + 6);

  const overdue: Task[] = [];
  const today: Task[] = [];
  const thisWeek: Task[] = [];
  const later: Task[] = [];
  const done: Task[] = [];

  for (const task of tasks) {
    if (task.status === 'DONE') { done.push(task); continue; }
    if (!task.dueDate) { later.push(task); continue; }
    const due = new Date(task.dueDate);
    if (due < todayStart) overdue.push(task);
    else if (due <= todayEnd) today.push(task);
    else if (due <= weekEnd) thisWeek.push(task);
    else later.push(task);
  }

  return { overdue, today, thisWeek, later, done };
}

export function useTasksManager() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('today');

  const { data: tasks = [], isPending } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').catch(() => []),
  });

  useQuery({
    queryKey: ['settings'],
    queryFn: () =>
      api
        .get<{ lightTheme: boolean }>('/users/me/settings')
        .then((settings) => {
          const isDark = !settings.lightTheme;
          document.documentElement.classList.toggle('dark', isDark);
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
          return settings;
        })
        .catch(console.error),
  });

  async function handleCreate(title: string, dueDate: string, subtaskTitles: string[] = [], description?: string, courseId?: number) {
    const newTask = await api.post<Task>('/tasks', { title, dueDate, description, courseId });
    await Promise.all(
      subtaskTitles.map((subTitle) =>
        api.post<Task>('/tasks', { title: subTitle, dueDate, parentId: newTask.id })
      )
    );
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }

  async function handleToggle(id: number) {
    const updated = await api.patch<Task>(`/tasks/${id}/toggle-done`, {});
    queryClient.setQueryData<Task[]>(['tasks'], (prev = []) =>
      prev.map((t) => (t.id === id ? updated : t))
    );
  }

  async function handleEditFull(
    id: number,
    data: { title: string; dueDate: string; description?: string; status?: TaskStatus },
    subtasksToAdd: string[],
    subtaskIdsToDelete: number[]
  ) {
    await Promise.all([
      api.patch<Task>(`/tasks/${id}`, data),
      ...subtaskIdsToDelete.map((subId) => api.delete(`/tasks/${subId}`)),
    ]);
    await Promise.all(
      subtasksToAdd.map((title) =>
        api.post<Task>('/tasks', { title, dueDate: data.dueDate, parentId: id })
      )
    );
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }

  async function handleDelete(id: number) {
    await api.delete(`/tasks/${id}`);
    queryClient.setQueryData<Task[]>(['tasks'], (prev = []) => prev.filter((t) => t.id !== id));
  }

  const { overdue, today, thisWeek, later, done } = splitTasks(tasks);

  const counts = {
    overdue: overdue.length,
    today: today.length,
    thisWeek: thisWeek.length,
    later: later.length,
    done: done.length,
  };

  return {
    activeFilter,
    setActiveFilter,
    isPending,
    overdue,
    today,
    thisWeek,
    later,
    done,
    counts,
    handleCreate,
    handleToggle,
    handleEditFull,
    handleDelete,
  };
}