import { ClipboardCheck, Clock, ClipboardList, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav({ active }: { active: 'tasks' | 'today' | 'notes' | 'profile' }) {
  const items = [
    { icon: <ClipboardCheck />, label: 'Tasks', href: '/tasks' },
    { icon: <Clock />, label: 'Today', href: '/today' },
    { icon: <ClipboardList />, label: 'Notes', href: '/notes' },
    { icon: <Users />, label: 'Profile', href: '/profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around transition-colors">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          className="flex flex-col items-center justify-center py-3 px-4 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <span
            className={cn(
              'text-xl mb-1',
              active === item.label.toLowerCase() ? 'text-blue-600 dark:text-blue-400' : ''
            )}
          >
            {item.icon}
          </span>
          <span
            className={cn(
              'text-xs font-medium',
              active === item.label.toLowerCase() ? 'text-blue-600 dark:text-blue-400' : ''
            )}
          >
            {item.label}
          </span>
        </a>
      ))}
    </div>
  );
}
