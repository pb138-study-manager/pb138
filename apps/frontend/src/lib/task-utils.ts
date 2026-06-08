import { Task } from '@/types';

export function getUrgency(dueDate: string | null | undefined): 'high' | 'medium' | 'low' | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return 'high';
  if (diff < 24 * 60 * 60 * 1000) return 'high';
  if (diff < 72 * 60 * 60 * 1000) return 'medium';
  return 'low';
}

export function getCountdown(dueDate: string | null | undefined): string {
  if (!dueDate) return '';
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return 'Overdue';
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}

export function splitTasks(tasks: Task[]) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(todayEnd);
  weekEnd.setDate(weekEnd.getDate() + 6);

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
