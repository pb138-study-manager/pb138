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
    activeFilter,
    setActiveFilter,
    isPending,
    today,
    backlog,
    done,
    counts,
    handleCreate,
    handleToggle,
    handleDelete,
  } = useTasksManager();

  if (isPending) {
    return (
      <div className="flex-1 w-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <p className="text-gray-400 dark:text-gray-500">{t('tasks.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-8">
          <TaskSidebar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
          />
          <div className="flex-1" />
        </div>

        <div>
          <TaskSection
            title={t('tasks.today')}
            count={counts.today}
            tasks={today}
            variant="default"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
          <TaskSection
            title={t('tasks.backlog')}
            count={counts.backlog}
            tasks={backlog}
            variant="backlog"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
          <TaskSection
            title={t('tasks.done')}
            count={counts.done}
            tasks={done}
            variant="done"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
