import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  key: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface SegmentedTabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  variant?: 'pill' | 'underline';
  noBorder?: boolean;
  className?: string;
}

export function SegmentedTabs({
  items,
  value,
  onChange,
  variant = 'pill',
  noBorder = false,
  className,
}: SegmentedTabsProps) {
  if (variant === 'underline') {
    return (
      <div className={cn('flex', !noBorder && 'border-b border-gray-200 dark:border-gray-700', className)}>
        {items.map((item) => {
          const isActive = item.key === value;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {item.icon}
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    'ml-1 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn('inline-flex rounded-2xl bg-gray-100 dark:bg-gray-800 p-1 gap-0.5', className)}
    >
      {items.map((item) => {
        const isActive = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                  isActive
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
