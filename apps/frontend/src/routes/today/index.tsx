import { createFileRoute } from '@tanstack/react-router';
import TaskSection from '@/components/tasks/tasks-section';
import { useTranslation } from 'react-i18next';
import { useTodayManager } from '@/hooks/useTodayManager';
import { EventCard } from '@/components/timeline/EventCard';

export const Route = createFileRoute('/today/')({
  component: TodayPage,
});

function TodayPage() {
  const { t } = useTranslation();
  const {
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
  } = useTodayManager();

  if (isPending) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const visibleEvents = todayEvents.slice(0, 2);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between gap-3">
          {/* Left: title + pills */}
          <div className="shrink-0">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              {t('nav.today')}
            </h1>
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {counts.today} {t('tasks.today')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                {counts.backlog} {t('tasks.backlog')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-500 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {counts.done} {t('tasks.done')}
              </span>
            </div>
          </div>

          {/* Right: event cards (compact) */}
          {visibleEvents.length > 0 && (
            <div className="flex flex-col gap-1.5 w-[55%] min-w-0">
              {visibleEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  compact
                  onEdit={(data) => editEvent(event.id, data)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task sections */}
      <div className="px-4 py-6">
        <TaskSection
          title={t('tasks.today')}
          count={counts.today}
          tasks={todayTasks}
          variant="default"
          onTaskCreated={handleCreate}
          onToggle={handleToggle}
          onEditFull={handleEditFull}
          onDelete={handleDelete}
        />
        <TaskSection
          title={t('tasks.backlog')}
          count={counts.backlog}
          tasks={backlogTasks}
          variant="backlog"
          onTaskCreated={handleCreate}
          onToggle={handleToggle}
          onEditFull={handleEditFull}
          onDelete={handleDelete}
        />
        <TaskSection
          title={t('tasks.done')}
          count={counts.done}
          tasks={doneTasks}
          variant="done"
          onTaskCreated={handleCreate}
          onToggle={handleToggle}
          onEditFull={handleEditFull}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
