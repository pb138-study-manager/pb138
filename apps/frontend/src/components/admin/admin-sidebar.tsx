import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import {
  Database,
  FileText,
  LayoutDashboard,
  Server,
  Shield,
  SlidersHorizontal,
  Users,
} from 'lucide-react';

const items: { to: string; label: string; icon: ReactNode; exact?: boolean }[] = [
  { to: '/admin', label: 'Overview', icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: '/admin/settings', label: 'System settings', icon: <SlidersHorizontal className="size-4" /> },
  { to: '/admin/logs', label: 'System logs', icon: <FileText className="size-4" /> },
  { to: '/admin/database', label: 'Database', icon: <Database className="size-4" /> },
  { to: '/admin/users', label: 'Users', icon: <Users className="size-4" /> },
  { to: '/admin/roles', label: 'Roles', icon: <Shield className="size-4" /> },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Server className="size-4 text-indigo-600" />
          Admin
        </span>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
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
                  ? 'bg-indigo-50 text-indigo-800'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-4 px-4 text-xs leading-relaxed text-gray-500">
        Frontend preview only. Wire these screens to <code className="rounded bg-gray-100 px-1">/admin/*</code> API
        when the backend is ready.
      </p>
    </aside>
  );
}
