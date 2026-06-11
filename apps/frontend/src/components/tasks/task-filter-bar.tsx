import { useTranslation } from 'react-i18next';
import { Task } from '@/types';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

const PRIORITY_PILLS: { value: Priority; labelKey: string; activeClass: string }[] = [
  { value: 'LOW', labelKey: 'tasks.priorityLow', activeClass: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'MEDIUM', labelKey: 'tasks.priorityMedium', activeClass: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'HIGH', labelKey: 'tasks.priorityHigh', activeClass: 'bg-red-100 text-red-700 border-red-300' },
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
            <button
              key={value}
              onClick={() => onTogglePriority(value)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${active ? activeClass : INACTIVE}`}
            >
              {t(labelKey)}
            </button>
          );
        })}

      {hasAnyTags &&
        allUniqueTags.map((tag) => {
          const active = activeTags.has(tag);
          return (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${active ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : INACTIVE}`}
            >
              {tag}
            </button>
          );
        })}

      {isActive && (
        <button
          onClick={onClear}
          className="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium transition-colors"
        >
          {t('tasks.clearFilters')}
        </button>
      )}
    </div>
  );
}
