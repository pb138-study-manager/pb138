import { useTranslation } from 'react-i18next';

export default function TaskSidebar({
  counts,
}: {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: { today: number; backlog: number; done: number };
}) {
  const { t } = useTranslation();

  return (
    <div className="w-32">
      <div className="mb-4">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">
          {t('tasks.title')}{' '}
          <span className="text-2xl text-gray-400 dark:text-gray-500 transition-colors">
            {counts.today + counts.backlog + counts.done}
          </span>
        </h2>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex items-baseline gap-2 border-l-4 border-blue-600 dark:border-blue-500 pl-3 transition-colors">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors">
              {counts.today}
            </span>
            <span className="text-gray-600 dark:text-gray-400 font-medium transition-colors">
              {t('tasks.today')}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2 border-l-4 border-orange-500 dark:border-orange-400 pl-3 transition-colors">
            <span className="text-2xl font-bold text-orange-500 dark:text-orange-400 transition-colors">
              {counts.backlog}
            </span>
            <span className="text-gray-600 dark:text-gray-400 font-medium transition-colors">
              {t('tasks.backlog')}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2 border-l-4 border-green-600 dark:border-green-500 pl-3 transition-colors">
            <span className="text-2xl font-bold text-green-600 dark:text-green-500 transition-colors">
              {counts.done}
            </span>
            <span className="text-gray-600 dark:text-gray-400 font-medium transition-colors">
              {t('tasks.done')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
