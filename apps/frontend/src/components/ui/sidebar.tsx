import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ClipboardCheck,
  Clock,
  ClipboardList,
  Users,
  ChevronLeft,
  ChevronRight,
  Menu,
  BookOpen,
  CalendarDays,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRoleMode } from '@/lib/roleMode';

export default function Sidebar({ activeTab }: { activeTab: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t } = useTranslation();
  const { mode } = useRoleMode();

  const { data: me } = useQuery({
    queryKey: ['userMe'],
    queryFn: () => api.get<{ roles: string[] }>('/users/me').catch(() => null),
  });

  const isTeacher = me?.roles?.includes('TEACHER') ?? false;

  const studentNavItems = [
    { id: 'today', icon: <Clock className="w-5 h-5 shrink-0" />, label: t('nav.today'), href: '/today' },
    { id: 'tasks', icon: <ClipboardCheck className="w-5 h-5 shrink-0" />, label: t('nav.tasks'), href: '/tasks' },
    { id: 'courses', icon: <BookOpen className="w-5 h-5 shrink-0" />, label: t('nav.courses'), href: '/courses' },
    { id: 'notes', icon: <ClipboardList className="w-5 h-5 shrink-0" />, label: t('nav.notes'), href: '/notes' },
    { id: 'timeline', icon: <CalendarDays className="w-5 h-5 shrink-0" />, label: t('nav.timeline'), href: '/timeline' },
    { id: 'profile', icon: <Users className="w-5 h-5 shrink-0" />, label: t('nav.profile'), href: '/profile' },
    { id: 'others', icon: <Menu className="w-5 h-5 shrink-0" />, label: t('nav.others'), href: '/others' },
  ];

  const teacherNavItems = [
    { id: 'teachers', icon: <GraduationCap className="w-5 h-5 shrink-0" />, label: 'My Classes', href: '/teachers' },
    { id: 'profile', icon: <Users className="w-5 h-5 shrink-0" />, label: t('nav.profile'), href: '/profile' },
  ];

  const navItems = (isTeacher && mode === 'teacher') ? teacherNavItems : studentNavItems;

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 sticky top-0 h-screen z-10 transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div
        className={cn(
          'flex h-16 items-center border-b border-gray-200 dark:border-gray-800 transition-colors',
          isCollapsed ? 'justify-center px-0' : 'justify-between px-4'
        )}
      >
        {!isCollapsed && (
          <Link
            to="/tasks"
            className="text-lg font-bold text-indigo-600 dark:text-indigo-400 truncate"
          >
            Study Manager
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="dark:text-gray-300 dark:hover:bg-gray-800 shrink-0"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>


<div className={cn('flex-1 py-6 space-y-2', isCollapsed ? 'px-3' : 'px-4')}>
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className={cn(
              'flex items-center rounded-lg transition-colors font-medium',
              isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5',
              activeTab === item.id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
            )}
            title={isCollapsed ? item.label : undefined}
          >
            {item.icon}
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </div>
    </aside>
  );
}
