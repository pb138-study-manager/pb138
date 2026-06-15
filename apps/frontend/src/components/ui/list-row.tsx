import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ListRowProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameChange?: (v: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
  className?: string;
}

export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  className,
}: ListRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group',
        onClick && !isRenaming && 'cursor-pointer',
        className
      )}
      onClick={!isRenaming ? onClick : undefined}
    >
      {icon && <span className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</span>}
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue ?? ''}
            onChange={(e) => onRenameChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit?.();
              if (e.key === 'Escape') onRenameCancel?.();
            }}
            onBlur={onRenameSubmit}
            className="w-full bg-transparent text-sm font-medium text-gray-900 dark:text-white outline-none border-b border-indigo-400"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</p>
            {subtitle && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{subtitle}</p>
            )}
          </>
        )}
      </div>
      {trailing && (
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {trailing}
        </div>
      )}
    </div>
  );
}
