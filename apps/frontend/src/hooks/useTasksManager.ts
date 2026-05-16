import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Task, TaskStatus } from '@/types';

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

  async function handleEdit(
    id: number,
    data: { title?: string; description?: string; dueDate?: string }
  ) {
    const updated = await api.patch<Task>(`/tasks/${id}`, data);
    queryClient.setQueryData<Task[]>(['tasks'], (prev = []) =>
      prev.map((t) => (t.id === id ? { ...t, ...updated } : t))
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

  const { today, backlog, done } = splitTasks(tasks);

  const counts = {
    today: today.length,
    backlog: backlog.length,
    done: done.length,
  };

  return {
    activeFilter,
    setActiveFilter,
    isPending,
    today,
    backlog,
    done,
    counts,
    handleCreate,
    handleToggle,
    handleEdit,
    handleEditFull,
    handleDelete,
  };
}