import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { ArrowLeft, FileText, LayoutDashboard, Server, Shield, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const items: { to: string; label: string; icon: ReactNode; exact?: boolean }[] = [
  { to: '/admin', label: 'Overview', icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: '/admin/logs', label: 'System logs', icon: <FileText className="size-4" /> },
  { to: '/admin/users', label: 'Users', icon: <Users className="size-4" /> },
  { to: '/admin/roles', label: 'Roles', icon: <Shield className="size-4" /> },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex h-14 items-center border-b border-gray-200 dark:border-gray-800 px-4">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <Server className="size-4 text-indigo-600" />
          Admin
        </span>
      </div>
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {items.map((item) => {
          const active = item.exact
            ? pathname === '/admin' || pathname === '/admin/'
            : pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 dark:border-gray-800 p-2">
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          {t('profile.backToApp')}
        </Link>
      </div>
    </aside>
  );
}
