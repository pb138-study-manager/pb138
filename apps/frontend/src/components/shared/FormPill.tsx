import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormPillProps {
  label: string;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

const ACTIVE =
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
const INACTIVE =
  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700';

export function FormPill({ label, icon, active, onClick, className, children }: FormPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium border transition-colors',
        active ? ACTIVE : INACTIVE,
        className
      )}
    >
      {icon}
      {label}
      {children}
    </button>
  );
}
