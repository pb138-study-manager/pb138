import {
  ClipboardCheck,
  Clock,
  ClipboardList,
  Users,
  Menu,
  LayoutDashboard,
  UserSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useProfileManager } from '@/hooks/useProfileManager';
import { NavItem } from '@/types';

export default function BottomNav({ active }: { active: string }) {
  const { t } = useTranslation();
  const { customNav } = useProfileManager();

  // Fallback to defaults while fetching to prevent empty white flash
  const defaultItems: NavItem[] = [
    { id: 'tasks', label: 'nav.tasks', href: '/tasks' },
    { id: 'today', label: 'nav.today', href: '/today' },
    { id: 'notes', label: 'nav.notes', href: '/notes' },
    { id: 'others', label: 'nav.others', href: '/others' },
  ];

  const items: NavItem[] =
    customNav && Array.isArray(customNav) && customNav.length > 0 ? customNav : defaultItems;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around transition-colors">
      {items.map((item: NavItem) => {
        // Need to reconstruct icons if customNav provides them as strings/names
        let IconComponent;
        switch (item.id) {
          case 'tasks':
            IconComponent = <ClipboardCheck />;
            break;
          case 'today':
            IconComponent = <Clock />;
            break;
          case 'notes':
            IconComponent = <ClipboardList />;
            break;
          case 'profile':
            IconComponent = <Users />;
            break;
          case 'others':
            IconComponent = <Menu />;
            break;
          case 'dashboard':
            IconComponent = <LayoutDashboard />;
            break;
          case 'teachers':
            IconComponent = <UserSquare />;
            break;
          default:
            IconComponent = <ClipboardCheck />;
            break; // Fallback
        }

        return (
          <Link
            key={item.id}
            to={item.href}
            className="flex flex-col items-center justify-center py-3 px-4 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <span
              className={cn(
                'text-xl mb-1',
                active === item.id ? 'text-blue-600 dark:text-blue-400' : ''
              )}
            >
              {IconComponent}
            </span>
            <span
              className={cn(
                'text-xs font-medium',
                active === item.id ? 'text-blue-600 dark:text-blue-400' : ''
              )}
            >
              {t(`nav.${item.id}`)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
