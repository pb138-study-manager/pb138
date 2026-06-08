import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Event, EventType, Task, TaskStatus } from '@/types';
import { isSameDay } from './timeline-utils';

export function useTodayManager() {
  const queryClient = useQueryClient();

  const { data: tasks = [], isPending } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').catch(() => []),
  });

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const weekEnd = new Date(todayEnd);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const { data: events = [] } = useQuery({
    queryKey: ['events-today', todayStart.toISOString()],
    queryFn: () =>
      api.get<Event[]>(`/events?from=${todayStart.toISOString()}&to=${weekEnd.toISOString()}`).catch(() => []),
  });

  const todayEvents = events
    .filter((e) => isSameDay(new Date(e.startDate), now))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const todayTasks = tasks.filter((t) => {
    if (t.status === 'DONE' || !t.dueDate) return false;
    return isSameDay(new Date(t.dueDate), now);
  });

  const backlogTasks = tasks.filter((t) => {
    if (t.status === 'DONE') return false;
    if (!t.dueDate) return true;
    return new Date(t.dueDate) < todayStart;
  });

  const doneTasks = tasks.filter((t) => t.status === 'DONE');

  const counts = {
    today: todayTasks.length,
    backlog: backlogTasks.length,
    done: doneTasks.length,
  };

  async function handleCreate(
    title: string,
    dueDate: string | undefined,
    subtaskTitles: string[] = [],
    description?: string,
    courseId?: number,
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null,
    tags?: string[]
  ) {
    const newTask = await api.post<Task>('/tasks', {
      title,
      dueDate,
      description,
      courseId,
      ...(priority != null && { priority }),
      ...(tags && tags.length > 0 && { tags }),
    });
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

  async function editEvent(
    id: number,
    data: { title: string; startDate: string; endDate: string; description?: string | null; place?: string; type?: EventType }
  ) {
    const updated = await api.patch<Event>(`/events/${id}`, data);
    queryClient.setQueryData<Event[]>(['events-today', todayStart.toISOString()], (prev = []) =>
      prev.map((e) => (e.id === id ? updated : e))
    );
  }

  async function handleDelete(id: number) {
    await api.delete(`/tasks/${id}`);
    queryClient.setQueryData<Task[]>(['tasks'], (prev = []) => prev.filter((t) => t.id !== id));
  }

  return {
    isPending,
    todayTasks,
    backlogTasks,
    doneTasks,
    todayEvents,
    counts,
    handleCreate,
    handleToggle,
    handleEditFull,
    handleDelete,
    editEvent,
  };
}
