import { ClipboardCheck, Clock, ClipboardList, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';

export default function BottomNav({ active }: { active: 'tasks' | 'today' | 'notes' | 'profile' }) {
  const { t } = useTranslation();

  const items = [
    { id: 'tasks', icon: <ClipboardCheck />, label: t('nav.tasks'), href: '/tasks' },
    { id: 'today', icon: <Clock />, label: t('nav.today'), href: '/today' },
    { id: 'notes', icon: <ClipboardList />, label: t('nav.notes'), href: '/notes' },
    { id: 'profile', icon: <Users />, label: t('nav.profile'), href: '/profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around transition-colors">
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.href}
          className="flex flex-col items-center justify-center py-3 px-4 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <span
            className={cn(
              'text-xl mb-1',
              active === item.id ? 'text-blue-600 dark:text-blue-400' : ''
            )}
          >
            {item.icon}
          </span>
          <span
            className={cn(
              'text-xs font-medium',
              active === item.id ? 'text-blue-600 dark:text-blue-400' : ''
            )}
          >
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
