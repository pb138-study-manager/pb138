import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Task } from '@/types';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

const PRIORITY_PILLS: { value: Priority; labelKey: string; activeClass: string }[] = [
  {
    value: 'LOW',
    labelKey: 'tasks.priorityLow',
    activeClass:
      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800',
  },
  {
    value: 'MEDIUM',
    labelKey: 'tasks.priorityMedium',
    activeClass:
      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800',
  },
  {
    value: 'HIGH',
    labelKey: 'tasks.priorityHigh',
    activeClass:
      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800',
  },
];

const INACTIVE =
  'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500';

export default function TaskFilterBar({
  allTasks,
  activePriorities,
  activeTags,
  onTogglePriority,
  onToggleTag,
  onClear,
}: {
  allTasks: Task[];
  activePriorities: Set<Priority>;
  activeTags: Set<string>;
  onTogglePriority: (p: Priority) => void;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();

  const allUniqueTags = Array.from(new Set(allTasks.flatMap((t) => t.tags ?? []))).sort();

  const hasAnyPriority = allTasks.some((t) => t.priority);
  const hasAnyTags = allUniqueTags.length > 0;
  const isActive = activePriorities.size > 0 || activeTags.size > 0;

  if (!hasAnyPriority && !hasAnyTags) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {hasAnyPriority &&
        PRIORITY_PILLS.map(({ value, labelKey, activeClass }) => {
          const active = activePriorities.has(value);
          return (
            <Button
              key={value}
              type="button"
              variant="outline"
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${active ? activeClass : INACTIVE}`}
              onClick={() => onTogglePriority(value)}
            >
              {t(labelKey)}
            </Button>
          );
        })}

      {hasAnyTags &&
        allUniqueTags.map((tag) => {
          const active = activeTags.has(tag);
          return (
            <Button
              key={tag}
              type="button"
              variant="outline"
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${active ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800' : INACTIVE}`}
              onClick={() => onToggleTag(tag)}
            >
              {tag}
            </Button>
          );
        })}

      {isActive && (
        <Button
          type="button"
          variant="outline"
          className="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium transition-colors"
          onClick={onClear}
        >
          {t('tasks.clearFilters')}
        </Button>
      )}
    </div>
  );
}
