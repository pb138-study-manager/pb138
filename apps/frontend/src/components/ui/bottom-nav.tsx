import {
  ClipboardCheck,
  Clock,
  ClipboardList,
  Users,
  Menu,
  BookOpen,
  GraduationCap,
  ArrowLeftRight,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRoleMode } from '@/lib/roleMode';
import { useAIPanel } from '@/context/AIPanelContext';
import { AVAILABLE_ITEMS } from '@/hooks/useCustomNavManager';

const ICON_MAP: Record<string, JSX.Element> = {
  today: <Clock className="w-5 h-5" />,
  tasks: <ClipboardCheck className="w-5 h-5" />,
  courses: <BookOpen className="w-5 h-5" />,
  notes: <ClipboardList className="w-5 h-5" />,
  timeline: <CalendarDays className="w-5 h-5" />,
  profile: <Users className="w-5 h-5" />,
  others: <Menu className="w-5 h-5" />,
  teachers: <GraduationCap className="w-5 h-5" />,
};

interface NavItem {
  id: string;
  label: string;
  href: string;
}

const DEFAULT_STUDENT_IDS = ['today', 'tasks', 'courses', 'notes', 'others'];

export default function BottomNav({ active }: { active: string }) {
  const { t } = useTranslation();
  const { mode, toggle } = useRoleMode();
  const { toggle: toggleAIPanel } = useAIPanel();
  const navigate = useNavigate();

  const { data: me } = useQuery({
    queryKey: ['userMe'],
    queryFn: () =>
      api.get<{ roles: string[]; settings: { customNav?: NavItem[] | null } }>('/users/me').catch(() => null),
  });

  const isTeacher = me?.roles?.includes('TEACHER') ?? false;
  const isTeacherMode = isTeacher && mode === 'teacher';

  const teacherItems: NavItem[] = [
    { id: 'teachers', label: 'My Classes', href: '/teachers' },
    { id: 'profile', label: t('nav.profile'), href: '/profile' },
  ];

  function buildStudentItems(): NavItem[] {
    const saved = me?.settings?.customNav;
    const ids: string[] = saved && Array.isArray(saved) && saved.length > 0
      ? saved.map((n) => n.id)
      : DEFAULT_STUDENT_IDS;

    return ids
      .map((id) => AVAILABLE_ITEMS.find((item) => item.id === id))
      .filter((item): item is typeof AVAILABLE_ITEMS[number] => item !== undefined)
      .map((item) => ({
        id: item.id,
        label: item.label.includes('.') ? t(item.label) : item.label,
        href: item.href,
      }));
  }

  const items = isTeacherMode ? teacherItems : buildStudentItems();

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
            {ICON_MAP[item.id] ?? <Menu className="w-5 h-5" />}
          </span>
          <span className={cn('text-xs font-medium', active === item.id ? 'text-indigo-600 dark:text-indigo-400' : '')}>
            {item.label}
          </span>
        </Link>
      ))}

      <button
        onClick={toggleAIPanel}
        className="flex flex-col items-center justify-center py-3 px-4 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
      >
        <Sparkles className="w-5 h-5 mb-1" />
        <span className="text-xs font-medium">{t('nav.aiCopilot')}</span>
      </button>

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
