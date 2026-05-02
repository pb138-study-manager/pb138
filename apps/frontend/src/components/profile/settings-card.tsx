import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import ThemeSetting from '@/components/profile/theme-setting';
import LanguageSetting from '@/components/profile/language-setting';
import NotificationSetting from '@/components/profile/notification-setting';
import ActionSetting from '@/components/profile/action-setting';

interface SettingsCardProps {
  theme: string;
  language: 'en' | 'cs';
  notificationsEnabled: boolean;
  onUpdateSettings: (key: 'lightTheme' | 'notificationsEnabled', value: boolean) => void;
  onChangeLanguage: (lng: 'en' | 'cs') => void;
}

export default function SettingsCard({
  theme,
  language,
  notificationsEnabled,
  onUpdateSettings,
  onChangeLanguage,
}: SettingsCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="border-0 rounded-3xl shadow-md dark:bg-gray-800 transition-colors">
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <ThemeSetting theme={theme} onUpdateSettings={onUpdateSettings} />

          <LanguageSetting language={language} onChangeLanguage={onChangeLanguage} />

          <NotificationSetting
            notificationsEnabled={notificationsEnabled}
            onUpdateSettings={onUpdateSettings}
          />

          <ActionSetting
            icon={<Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
            label={t('profile.integrations')}
          />

          <ActionSetting
            icon={
              <div className="w-5 h-5 rounded border-2 border-gray-600 dark:border-gray-300 flex items-center justify-center gap-0.5">
                <div className="w-1 h-1 rounded-full bg-gray-600 dark:bg-gray-300" />
                <div className="w-1 h-1 rounded-full bg-gray-600 dark:bg-gray-300" />
                <div className="w-1 h-1 rounded-full bg-gray-600 dark:bg-gray-300" />
                <div className="w-1 h-1 rounded-full bg-gray-600 dark:bg-gray-300" />
              </div>
            }
            label={t('profile.teachers')}
            onClick={() => navigate({ to: '/teachers' })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
