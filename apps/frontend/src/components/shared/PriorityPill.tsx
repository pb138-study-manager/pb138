import { cn } from '@/lib/utils';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

const priorityConfig: Record<Priority, { bg: string; text: string }> = {
  LOW: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-400',
  },
  MEDIUM: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
  },
  HIGH: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
  },
};

interface PriorityPillProps {
  priority: Priority;
  label?: string;
  className?: string;
}

export function PriorityPill({ priority, label, className }: PriorityPillProps) {
  const cfg = priorityConfig[priority];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        cfg.bg,
        cfg.text,
        className
      )}
    >
      {label ?? priority}
    </span>
  );
}
