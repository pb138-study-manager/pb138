import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Event, EventType, Task } from '@/types';

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as first day
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function useTimelineManager() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

  const weekDates = getWeekDates(weekStart);
  const weekEnd = new Date(weekDates[6]);
  weekEnd.setHours(23, 59, 59, 999);

  const { data: events = [], isPending } = useQuery({
    queryKey: ['events', weekStart.toISOString()],
    queryFn: () =>
      api.get<Event[]>(
        `/events?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`
      ).catch(() => []),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').catch(() => []),
  });

  // Synthetic deadline events derived from assignment tasks — one per unique assignment deadline per day
  const deadlineEvents: Event[] = (() => {
    const seen = new Set<string>();
    const result: Event[] = [];
    for (const task of tasks) {
      if (!task.assignmentDeadline) continue;
      const key = `${task.assignmentId}-${task.assignmentDeadline}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        id: -(task.assignmentId!),
        userId: task.userId,
        title: task.title,
        startDate: task.assignmentDeadline,
        endDate: task.assignmentDeadline,
        type: 'DEADLINE' as const,
        description: null,
        place: null,
        deletedAt: null,
      });
    }
    return result;
  })();

  const allEvents = [
    ...events.filter((e) => e.type !== 'DEADLINE'),
    ...deadlineEvents,
  ];

  const eventsForSelectedDate = allEvents.filter((e) =>
    isSameDay(new Date(e.startDate), selectedDate)
  );

  const tasksForSelectedDate = tasks.filter(
    (t) => t.dueDate && isSameDay(new Date(t.dueDate), selectedDate)
  );

  function prevWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
  }

  async function editEvent(
    id: number,
    data: { title: string; startDate: string; endDate: string; description?: string | null; place?: string; type?: EventType }
  ) {
    const updated = await api.patch<Event>(`/events/${id}`, data);
    queryClient.setQueryData<Event[]>(['events', weekStart.toISOString()], (prev = []) =>
      prev.map((e) => (e.id === id ? updated : e))
    );
  }

  async function createEvent(data: {
    title: string;
    startDate: string;
    endDate: string;
    description?: string;
    place?: string;
    type?: EventType;
  }) {
    const created = await api.post<Event>('/events', data);
    queryClient.invalidateQueries({ queryKey: ['events', weekStart.toISOString()] });
    return created;
  }

  async function toggleTask(id: number) {
    const updated = await api.patch<Task>(`/tasks/${id}/toggle-done`, {});
    queryClient.setQueryData<Task[]>(['tasks'], (prev = []) =>
      prev.map((t) => (t.id === id ? updated : t))
    );
  }

  async function editTaskFull(
    id: number,
    data: { title: string; dueDate: string; description?: string; status?: Task['status'] },
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

  async function deleteEvent(id: number) {
    if (id < 0) return; // synthetic deadline — cannot delete
    await api.delete(`/events/${id}`);
    queryClient.setQueryData<Event[]>(['events', weekStart.toISOString()], (prev = []) =>
      prev.filter((e) => e.id !== id)
    );
  }

  return {
    selectedDate,
    weekStart,
    weekDates,
    events: allEvents,
    eventsForSelectedDate,
    tasksForSelectedDate,
    isPending,
    selectDate,
    prevWeek,
    nextWeek,
    editEvent,
    createEvent,
    deleteEvent,
    toggleTask,
    editTaskFull,
  };
}
