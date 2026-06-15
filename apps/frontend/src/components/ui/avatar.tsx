import { cn } from '@/lib/utils';

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  dicebearSeed?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-14 h-14 text-sm',
};

export function Avatar({ src, name, dicebearSeed, size = 'md', className }: AvatarProps) {
  const sizeClass = sizeMap[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? 'avatar'}
        className={cn('rounded-full object-cover shrink-0', sizeClass, className)}
      />
    );
  }

  const initials = name ? getInitials(name) : null;

  if (initials) {
    return (
      <div
        className={cn(
          'rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0',
          sizeClass,
          className
        )}
      >
        <span className="font-bold text-indigo-600 dark:text-indigo-400">{initials}</span>
      </div>
    );
  }

  if (dicebearSeed) {
    return (
      <img
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(dicebearSeed)}`}
        alt="avatar"
        className={cn('rounded-full object-cover shrink-0', sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={cn('rounded-full bg-gray-200 dark:bg-gray-700 shrink-0', sizeClass, className)}
    />
  );
}
