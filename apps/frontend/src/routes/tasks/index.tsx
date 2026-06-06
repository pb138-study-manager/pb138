import { createFileRoute } from '@tanstack/react-router';
import TaskSection from '@/components/tasks/tasks-section';
import TaskSidebar from '@/components/tasks/tasks-sidebar';
import { useTranslation } from 'react-i18next';
import { useTasksManager } from '@/hooks/useTasksManager';

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

        <div>
          {counts.overdue > 0 && (
            <TaskSection
              title={t('tasks.overdue')}
              count={counts.overdue}
              tasks={overdue}
              variant="overdue"
              onTaskCreated={handleCreate}
              onToggle={handleToggle}
              onEditFull={handleEditFull}
              onDelete={handleDelete}
            />
          )}
          <TaskSection
            title={t('tasks.today')}
            count={counts.today}
            tasks={today}
            variant="default"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onEditFull={handleEditFull}
            onDelete={handleDelete}
          />
          <TaskSection
            title={t('tasks.thisWeek')}
            count={counts.thisWeek}
            tasks={thisWeek}
            variant="thisWeek"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onEditFull={handleEditFull}
            onDelete={handleDelete}
          />
          <TaskSection
            title={t('tasks.later')}
            count={counts.later}
            tasks={later}
            variant="later"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onEditFull={handleEditFull}
            onDelete={handleDelete}
          />
          <TaskSection
            title={t('tasks.done')}
            count={counts.done}
            tasks={done}
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
