import {
  ClipboardCheck,
  Clock,
  ClipboardList,
  Users,
  Menu,
  BookOpen,
  GraduationCap,
  ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRoleMode } from '@/lib/roleMode';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: JSX.Element;
}

export default function BottomNav({ active }: { active: string }) {
  const { t } = useTranslation();
  const { mode, toggle } = useRoleMode();
  const navigate = useNavigate();

  const { data: me } = useQuery({
    queryKey: ['userMe'],
    queryFn: () => api.get<{ roles: string[] }>('/users/me').catch(() => null),
  });

  const isTeacher = me?.roles?.includes('TEACHER') ?? false;

  const studentItems: NavItem[] = [
    { id: 'today', label: t('nav.today'), href: '/today', icon: <Clock className="w-5 h-5" /> },
    { id: 'tasks', label: t('nav.tasks'), href: '/tasks', icon: <ClipboardCheck className="w-5 h-5" /> },
    { id: 'courses', label: t('nav.courses'), href: '/courses', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'notes', label: t('nav.notes'), href: '/notes', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'others', label: t('nav.others'), href: '/others', icon: <Menu className="w-5 h-5" /> },
  ];

  const teacherItems: NavItem[] = [
    { id: 'teachers', label: 'My Classes', href: '/teachers', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'profile', label: t('nav.profile'), href: '/profile', icon: <Users className="w-5 h-5" /> },
  ];

  const isTeacherMode = isTeacher && mode === 'teacher';
  const items = isTeacherMode ? teacherItems : studentItems;

  function handleToggle() {
    toggle();
    navigate({ to: isTeacherMode ? '/today' : '/teachers' });
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around transition-colors">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.href}
          className="flex flex-col items-center justify-center py-3 px-4 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <span className={cn('mb-1', active === item.id ? 'text-indigo-600 dark:text-indigo-400' : '')}>
            {item.icon}
          </span>
          <span className={cn('text-xs font-medium', active === item.id ? 'text-indigo-600 dark:text-indigo-400' : '')}>
            {item.label}
          </span>
        </Link>
      ))}

      {isTeacher && (
        <button
          onClick={handleToggle}
          className="flex flex-col items-center justify-center py-3 px-4 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeftRight className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">{isTeacherMode ? 'Student' : 'Teacher'}</span>
        </button>
      )}
    </div>
  );
}
