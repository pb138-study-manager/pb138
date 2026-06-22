import { cn } from '@/lib/utils';

type Urgency = 'high' | 'medium' | 'low';

const urgencyConfig: Record<Urgency, { bg: string; text: string; dot: string }> = {
  high: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
  medium: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-400',
  },
  low: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-400',
    dot: 'bg-green-500',
  },
};

interface UrgencyPillProps {
  urgency: Urgency;
  label: string;
  className?: string;
}

export function UrgencyPill({ urgency, label, className }: UrgencyPillProps) {
  const cfg = urgencyConfig[urgency];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        cfg.bg,
        cfg.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
      {label}
    </span>
  );
}

export function UrgencyDot({ urgency, className }: { urgency: Urgency; className?: string }) {
  const cfg = urgencyConfig[urgency];
  return <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot, className)} />;
}
