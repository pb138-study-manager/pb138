import { describe, it, expect, beforeEach } from 'vitest';
import { getUrgency, getCountdown, splitTasks } from './task-utils';
import type { Task } from '@/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    userId: 1,
    assignmentId: null,
    courseId: null,
    parentId: null,
    title: 'Test task',
    description: null,
    dueDate: null,
    status: 'TODO',
    deletedAt: null,
    ...overrides,
  };
}

function dateOffset(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

describe('getUrgency', () => {
  it('returns null for null dueDate', () => {
    expect(getUrgency(null)).toBeNull();
  });

  it('returns null for undefined dueDate', () => {
    expect(getUrgency(undefined)).toBeNull();
  });

  it('returns high for overdue tasks (past dueDate)', () => {
    expect(getUrgency(dateOffset(-1))).toBe('high');
    expect(getUrgency(dateOffset(-48))).toBe('high');
  });

  it('returns high for tasks due within 24 hours', () => {
    expect(getUrgency(dateOffset(1))).toBe('high');
    expect(getUrgency(dateOffset(23))).toBe('high');
  });

  it('returns medium for tasks due within 72 hours but after 24h', () => {
    expect(getUrgency(dateOffset(25))).toBe('medium');
    expect(getUrgency(dateOffset(71))).toBe('medium');
  });

  it('returns low for tasks due after 72 hours', () => {
    expect(getUrgency(dateOffset(73))).toBe('low');
    expect(getUrgency(dateOffset(200))).toBe('low');
  });
});

describe('getCountdown', () => {
  it('returns the noDateLabel when dueDate is null', () => {
    expect(getCountdown(null, 'No date')).toBe('No date');
    expect(getCountdown(null)).toBe('');
  });

  it('returns the noDateLabel when dueDate is undefined', () => {
    expect(getCountdown(undefined, 'No date')).toBe('No date');
    expect(getCountdown(undefined)).toBe('');
  });

  it('returns Overdue for past dueDates', () => {
    expect(getCountdown(dateOffset(-1))).toBe('Overdue');
    expect(getCountdown(dateOffset(-100))).toBe('Overdue');
  });

  it('returns Today for tasks due within the next 24 hours', () => {
    expect(getCountdown(dateOffset(1))).toBe('Today');
    expect(getCountdown(dateOffset(23))).toBe('Today');
  });

  it('returns Tomorrow for tasks due in ~1 day', () => {
    expect(getCountdown(dateOffset(25))).toBe('Tomorrow');
    expect(getCountdown(dateOffset(47))).toBe('Tomorrow');
  });

  it('returns "in X days" for tasks further in the future', () => {
    expect(getCountdown(dateOffset(49))).toBe('in 2 days');
    expect(getCountdown(dateOffset(73))).toBe('in 3 days');
    expect(getCountdown(dateOffset(168))).toBe('in 7 days');
  });
});

describe('splitTasks', () => {
  let now: Date;

  beforeEach(() => {
    now = new Date();
  });

  it('returns empty buckets for empty input', () => {
    const result = splitTasks([]);
    expect(result.overdue).toHaveLength(0);
    expect(result.today).toHaveLength(0);
    expect(result.thisWeek).toHaveLength(0);
    expect(result.later).toHaveLength(0);
    expect(result.done).toHaveLength(0);
  });

  it('places DONE tasks into done bucket regardless of dueDate', () => {
    const task = makeTask({ status: 'DONE', dueDate: dateOffset(-24) });
    const { done, overdue } = splitTasks([task]);
    expect(done).toHaveLength(1);
    expect(overdue).toHaveLength(0);
  });

  it('places tasks without dueDate into later bucket', () => {
    const task = makeTask({ dueDate: null });
    const { later, overdue, today, thisWeek } = splitTasks([task]);
    expect(later).toHaveLength(1);
    expect(overdue).toHaveLength(0);
    expect(today).toHaveLength(0);
    expect(thisWeek).toHaveLength(0);
  });

  it('places overdue tasks (before today midnight) into overdue bucket', () => {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 0);
    const task = makeTask({ dueDate: yesterday.toISOString() });
    const { overdue } = splitTasks([task]);
    expect(overdue).toHaveLength(1);
  });

  it('places tasks due today into today bucket', () => {
    const todayNoon = new Date(now);
    todayNoon.setHours(12, 0, 0, 0);
    const task = makeTask({ dueDate: todayNoon.toISOString() });
    const { today } = splitTasks([task]);
    expect(today).toHaveLength(1);
  });

  it('places tasks due this week (after today) into thisWeek bucket', () => {
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    const task = makeTask({ dueDate: in3Days.toISOString() });
    const { thisWeek } = splitTasks([task]);
    expect(thisWeek).toHaveLength(1);
  });

  it('places tasks due after this week into later bucket', () => {
    const in10Days = new Date(now);
    in10Days.setDate(in10Days.getDate() + 10);
    const task = makeTask({ dueDate: in10Days.toISOString() });
    const { later } = splitTasks([task]);
    expect(later).toHaveLength(1);
  });

  it('correctly distributes a mixed list', () => {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayNoon = new Date(now);
    todayNoon.setHours(12, 0, 0, 0);

    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);

    const in10Days = new Date(now);
    in10Days.setDate(in10Days.getDate() + 10);

    const tasks = [
      makeTask({ id: 1, dueDate: yesterday.toISOString() }),
      makeTask({ id: 2, dueDate: todayNoon.toISOString() }),
      makeTask({ id: 3, dueDate: in3Days.toISOString() }),
      makeTask({ id: 4, dueDate: in10Days.toISOString() }),
      makeTask({ id: 5, dueDate: null }),
      makeTask({ id: 6, status: 'DONE', dueDate: yesterday.toISOString() }),
    ];

    const result = splitTasks(tasks);
    expect(result.overdue.map((t) => t.id)).toEqual([1]);
    expect(result.today.map((t) => t.id)).toEqual([2]);
    expect(result.thisWeek.map((t) => t.id)).toEqual([3]);
    expect(result.later.map((t) => t.id)).toContain(4);
    expect(result.later.map((t) => t.id)).toContain(5);
    expect(result.done.map((t) => t.id)).toEqual([6]);
  });

  it('does not mutate the input array', () => {
    const task = makeTask({ dueDate: dateOffset(-1) });
    const input = [task];
    splitTasks(input);
    expect(input).toHaveLength(1);
  });
});
