import { useTranslation } from 'react-i18next';

export default function TaskSidebar({
  counts,
}: {
  counts: { overdue: number; today: number; thisWeek: number; later: number; done: number };
}) {
  const { t } = useTranslation();
  const total = counts.overdue + counts.today + counts.thisWeek + counts.later + counts.done;

  return (
    <div className="w-36 shrink-0">
      <div className="mb-4">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">
          {t('tasks.title')}
        </h2>
      </div>

      <div className="space-y-2">
        {counts.overdue > 0 && (
          <div className="flex items-baseline gap-2 border-l-4 border-red-500 pl-3">
            <span className="text-xl font-bold text-red-500">{counts.overdue}</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('tasks.overdue')}</span>
          </div>
        )}
        <div className="flex items-baseline gap-2 border-l-4 border-blue-600 dark:border-blue-500 pl-3">
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{counts.today}</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('tasks.today')}</span>
        </div>
        <div className="flex items-baseline gap-2 border-l-4 border-purple-600 dark:border-purple-400 pl-3">
          <span className="text-xl font-bold text-purple-600 dark:text-purple-400">{counts.thisWeek}</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('tasks.thisWeek')}</span>
        </div>
        <div className="flex items-baseline gap-2 border-l-4 border-gray-400 pl-3">
          <span className="text-xl font-bold text-gray-500 dark:text-gray-400">{counts.later}</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('tasks.later')}</span>
        </div>
        <div className="flex items-baseline gap-2 border-l-4 border-green-600 dark:border-green-500 pl-3">
          <span className="text-xl font-bold text-green-600 dark:text-green-500">{counts.done}</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('tasks.done')}</span>
        </div>
        <div className="flex items-baseline gap-2 pl-3 pt-1 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xl font-bold text-gray-400">{total}</span>
          <span className="text-gray-400 text-sm font-medium">{t('tasks.total')}</span>
        </div>
      </div>
    </div>
  );
}
