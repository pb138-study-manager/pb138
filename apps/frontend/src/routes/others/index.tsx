import { createFileRoute, useNavigate } from '@tanstack/react-router';
import BottomNav from '@/components/ui/bottom-nav';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import ActionSetting from '@/components/profile/action-setting';
import {
  Users,
  ClipboardCheck,
  Clock,
  ClipboardList,
  LayoutDashboard,
  UserSquare,
} from 'lucide-react';

export const Route = createFileRoute('/others/')({
  component: OthersPage,
});

function OthersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 transition-colors pb-24">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 transition-colors">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('others.title')}</h1>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-4">
        <Card className="border-0 rounded-3xl shadow-md dark:bg-gray-800 transition-colors overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <ActionSetting
                icon={<Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                label={t('nav.profile')}
                onClick={() => navigate({ to: '/profile' })}
              />
              <ActionSetting
                icon={<UserSquare className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                label={t('profile.teachers')}
                onClick={() => navigate({ to: '/teachers' })}
              />
              <ActionSetting
                icon={<ClipboardCheck className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                label={t('nav.tasks')}
                onClick={() => navigate({ to: '/tasks' })}
              />
              <ActionSetting
                icon={<Clock className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                label={t('nav.today')}
                onClick={() => navigate({ to: '/today' })}
              />
              <ActionSetting
                icon={<ClipboardList className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                label={t('nav.notes')}
                onClick={() => navigate({ to: '/notes' })}
              />
              <ActionSetting
                icon={<LayoutDashboard className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                label="Dashboard"
                onClick={() => navigate({ to: '/dashboard' })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav active="others" />
    </div>
  );
}
