import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Task, TaskStatus } from '@/types';
import { useTranslation } from 'react-i18next';

export function useTodayManager() {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: tasks = [], isPending } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').catch(() => []),
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

  const isSameDay = (date1: Date, date2: Date) =>
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

  const todayTasks = tasks.filter((task) => {
    if (task.status === 'DONE') return false;
    const taskDate = new Date(task.dueDate);

    if (isSameDay(new Date(), selectedDate)) {
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      return taskDate <= todayEnd;
    }

    return isSameDay(taskDate, selectedDate);
  });

  const currentDate = new Intl.DateTimeFormat(i18n.language === 'cs' ? 'cs-CZ' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(selectedDate);

  return {
    selectedDate,
    setSelectedDate,
    isPending,
    todayTasks,
    currentDate,
    isSameDay,
    handleCreate,
    handleToggle,
    handleEdit,
    handleEditFull,
    handleDelete,
  };
}