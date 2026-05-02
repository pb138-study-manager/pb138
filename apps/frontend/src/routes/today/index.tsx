import { createFileRoute } from '@tanstack/react-router';
import TaskSection from '@/components/tasks/tasks-section';
import WeekCalendar from '@/components/today/week-calendar';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { useTodayManager } from '@/hooks/useTodayManager';

export const Route = createFileRoute('/today/')({
  component: TodayPage,
});

function TodayPage() {
  const { t, i18n } = useTranslation();
  const {
    selectedDate,
    setSelectedDate,
    isPending,
    todayTasks,
    currentDate,
    isSameDay,
    handleCreate,
    handleToggle,
    handleDelete,
  } = useTodayManager();

  if (isPending) {
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
