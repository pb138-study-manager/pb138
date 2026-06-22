import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EntityCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  accent?: string;
}

export function EntityCard({ children, className, onClick, accent }: EntityCardProps) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground border border-border rounded-2xl shadow-sm transition-shadow hover:shadow-md',
        onClick && 'cursor-pointer',
        className
      )}
      style={accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : undefined}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
