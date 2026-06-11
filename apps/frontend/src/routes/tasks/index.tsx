import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import TaskSection from '@/components/tasks/tasks-section';
import TaskSidebar from '@/components/tasks/tasks-sidebar';
import TaskFilterBar from '@/components/tasks/task-filter-bar';
import { useTranslation } from 'react-i18next';
import { useTasksManager } from '@/hooks/useTasksManager';
import { filterTasks } from '@/lib/task-utils';

export const Route = createFileRoute('/tasks/')({
  component: TasksPage,
});

export function TasksPage() {
  const { t } = useTranslation();
  const {
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
  } = useTasksManager();

  type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
  const [activePriorities, setActivePriorities] = useState<Set<Priority>>(new Set());
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  function togglePriority(p: Priority) {
    setActivePriorities((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  const allTasks = [...overdue, ...today, ...thisWeek, ...later, ...done];

  const filtered = {
    overdue: filterTasks(overdue, activePriorities, activeTags),
    today: filterTasks(today, activePriorities, activeTags),
    thisWeek: filterTasks(thisWeek, activePriorities, activeTags),
    later: filterTasks(later, activePriorities, activeTags),
    done: filterTasks(done, activePriorities, activeTags),
  };

  if (isPending) {
    return (
      <div className="flex-1 w-full bg-gray-50 dark:bg-gray-900 px-4 py-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6 mb-8">
          <TaskSidebar counts={counts} />
          <div className="flex-1" />
        </div>

        <TaskFilterBar
          allTasks={allTasks}
          activePriorities={activePriorities}
          activeTags={activeTags}
          onTogglePriority={togglePriority}
          onToggleTag={toggleTag}
          onClear={() => {
            setActivePriorities(new Set());
            setActiveTags(new Set());
          }}
        />

        <div>
          {filtered.overdue.length > 0 && (
            <TaskSection
              title={t('tasks.overdue')}
              count={filtered.overdue.length}
              tasks={filtered.overdue}
              variant="overdue"
              onTaskCreated={handleCreate}
              onToggle={handleToggle}
              onEditFull={handleEditFull}
              onDelete={handleDelete}
            />
          )}
          <TaskSection
            title={t('tasks.today')}
            count={filtered.today.length}
            tasks={filtered.today}
            variant="default"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onEditFull={handleEditFull}
            onDelete={handleDelete}
          />
          <TaskSection
            title={t('tasks.thisWeek')}
            count={filtered.thisWeek.length}
            tasks={filtered.thisWeek}
            variant="thisWeek"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onEditFull={handleEditFull}
            onDelete={handleDelete}
          />
          <TaskSection
            title={t('tasks.later')}
            count={filtered.later.length}
            tasks={filtered.later}
            variant="later"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onEditFull={handleEditFull}
            onDelete={handleDelete}
          />
          <TaskSection
            title={t('tasks.done')}
            count={filtered.done.length}
            tasks={filtered.done}
            variant="done"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onEditFull={handleEditFull}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
