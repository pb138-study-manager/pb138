import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Task } from '@/types';
import TaskSection from '@/components/tasks/tasks-section';
import WeekCalendar from '@/components/today/week-calendar';
import { api } from '@/lib/api';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const Route = createFileRoute('/today/')({
  component: TodayPage,
});

function TodayPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Synchronously apply theme from local storage to prevent white flash
  if (typeof document !== 'undefined' && localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }

  const { data: tasks = [], isLoading: loading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').catch(() => []),
  });

  async function handleCreate(title: string, dueDate: string) {
    const newTask = await api.post<Task>('/tasks', { title, dueDate });
    queryClient.setQueryData<Task[]>(['tasks'], (prev = []) => [...prev, newTask]);
  }

  async function handleToggle(id: number) {
    const updated = await api.patch<Task>(`/tasks/${id}/toggle-done`, {});
    queryClient.setQueryData<Task[]>(['tasks'], (prev = []) =>
      prev.map((t) => (t.id === id ? updated : t))
    );
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

    // If we're looking at today, also pull in older overdue tasks
    if (isSameDay(new Date(), selectedDate)) {
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      return taskDate <= todayEnd;
    }

    // Otherwise strictly filter to the specific day selected
    return isSameDay(taskDate, selectedDate);
  });

  const currentDate = new Intl.DateTimeFormat(i18n.language === 'cs' ? 'cs-CZ' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(selectedDate);

  if (loading) {
    return (
      <div className="flex-1 w-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <p className="text-gray-400 dark:text-gray-500">
          {t('tasks.loading') || 'Loading tasks...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('nav.today') || 'Today'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{currentDate}</p>
        </div>
        <WeekCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <Separator className="-mt-4 mb-6 bg-gray-200 dark:bg-gray-800" />
        <TaskSection
          title={
            isSameDay(new Date(), selectedDate)
              ? t('nav.today') || 'Today'
              : new Intl.DateTimeFormat(i18n.language === 'cs' ? 'cs-CZ' : 'en-US', {
                  weekday: 'long',
                }).format(selectedDate)
          }
          count={todayTasks.length}
          tasks={todayTasks}
          variant="default"
          onTaskCreated={handleCreate}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
