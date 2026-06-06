import { createFileRoute } from '@tanstack/react-router';
import TaskSection from '@/components/tasks/tasks-section';
import { useTranslation } from 'react-i18next';
import { useTodayManager } from '@/hooks/useTodayManager';
import { EventCard } from '@/components/timeline/EventCard';

export const Route = createFileRoute('/today/')({
  component: TodayPage,
});

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Dobré ráno';
  if (h >= 12 && h < 18) return 'Dobrý deň';
  return 'Dobrý večer';
}

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
      <div className="min-h-screen bg-white dark:bg-gray-900 px-4 py-6 space-y-4">
        <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-32 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const todayTotal = counts.today + counts.done;
  const progressPct = todayTotal > 0 ? Math.round((counts.done / todayTotal) * 100) : 0;
  const visibleEvents = todayEvents.slice(0, 2);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        {/* Greeting + progress */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
          {getGreeting()} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {counts.done} z {todayTotal} úloh hotových dnes
        </p>
        <div
          className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden
  mb-4"
        >
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Pôvodný layout: pills + events */}
        <div className="flex items-start justify-between gap-3">
          <div className="shrink-0">
            <div className="flex flex-col gap-1.5">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50
  dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {counts.today} {t('tasks.today')}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
  bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 text-sm font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                {counts.backlog} {t('tasks.backlog')}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50
  dark:bg-green-900/30 text-green-600 dark:text-green-500 text-sm font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {counts.done} {t('tasks.done')}
              </span>
            </div>
          </div>

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
