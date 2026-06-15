import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type FilterGroupType = 'priority' | 'tags' | 'deadline';

export interface FilterGroup {
  type: FilterGroupType;
  label: string;
  options: { key: string; label: string; color?: string }[];
  active: Set<string>;
  onToggle: (key: string) => void;
}

interface FilterControlProps {
  groups: FilterGroup[];
  onClear: () => void;
  className?: string;
}

export function FilterControl({ groups, onClear, className }: FilterControlProps) {
  const totalActive = groups.reduce((sum, g) => sum + g.active.size, 0);

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border h-8 px-2.5 text-sm font-medium transition-colors',
          'border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
          totalActive > 0 &&
            'border-indigo-400 text-indigo-700 dark:border-indigo-500 dark:text-indigo-300',
          className
        )}
      >
        <Filter size={14} />
        Filter
        {totalActive > 0 && (
          <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 text-xs font-semibold">
            {totalActive}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-64 p-3 space-y-4" align="start">
        {groups.map((group) => (
          <div key={group.type}>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.options.map((opt) => {
                const isActive = group.active.has(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => group.onToggle(opt.key)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border',
                      isActive
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700'
                        : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {opt.color && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {totalActive > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
