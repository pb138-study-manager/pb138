import { createFileRoute, useNavigate } from '@tanstack/react-router';
import BottomNav from '@/components/ui/bottom-nav';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import ActionSetting from '@/components/profile/action-setting';
import {
  Users,
  CalendarDays,
  LayoutPanelLeft,
  Clock,
  ClipboardCheck,
  BookOpen,
  ClipboardList,
  GraduationCap,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AVAILABLE_ITEMS } from '@/hooks/useCustomNavManager';

export const Route = createFileRoute('/others/')({
  component: OthersPage,
});

const ICON_MAP: Record<string, JSX.Element> = {
  today: <Clock className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
  tasks: <ClipboardCheck className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
  courses: <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
  notes: <ClipboardList className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
  timeline: <CalendarDays className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
  profile: <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
  teachers: <GraduationCap className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
};

const DEFAULT_NAV_IDS = ['today', 'tasks', 'courses', 'notes', 'others'];

function OthersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: me } = useQuery({
    queryKey: ['userMe'],
    queryFn: () =>
      api.get<{ settings: { customNav?: { id: string }[] | null } }>('/users/me').catch(() => null),
  });

  const navIds: string[] =
    me?.settings?.customNav &&
    Array.isArray(me.settings.customNav) &&
    me.settings.customNav.length > 0
      ? me.settings.customNav.map((n) => n.id)
      : DEFAULT_NAV_IDS;

  const hiddenItems = AVAILABLE_ITEMS.filter(
    (item) => item.id !== 'others' && !navIds.includes(item.id)
  );

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 transition-colors pb-24">
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 transition-colors">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('others.title')}</h1>
      </div>

      <div className="px-4 py-6 space-y-4">
        <Card className="border-0 rounded-3xl shadow-md dark:bg-gray-800 transition-colors overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {hiddenItems.map((item) => (
                <ActionSetting
                  key={item.id}
                  icon={ICON_MAP[item.id]}
                  label={item.label.includes('.') ? t(item.label) : item.label}
                  onClick={() => navigate({ to: item.href as '/' })}
                />
              ))}
              <ActionSetting
                icon={<LayoutPanelLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                label={t('profile.customizeNav') || 'Customize Navigation'}
                onClick={() => navigate({ to: '/custom-nav' })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav active="others" />
    </div>
  );
}
