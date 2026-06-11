import { Card, CardContent } from '@/components/ui/card';
import { LayoutPanelLeft } from 'lucide-react';
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
    <Card className="border-0 rounded-3xl shadow-md dark:bg-gray-800 transition-colors overflow-hidden">
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <ThemeSetting theme={theme} onUpdateSettings={onUpdateSettings} />

          <LanguageSetting language={language} onChangeLanguage={onChangeLanguage} />

          <NotificationSetting
            notificationsEnabled={notificationsEnabled}
            onUpdateSettings={onUpdateSettings}
          />

          <ActionSetting
            icon={<LayoutPanelLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
            label={t('profile.customizeNav') || 'Customize Navigation'}
            onClick={() => navigate({ to: '/custom-nav' })}
          />

        </div>
      </CardContent>
    </Card>
  );
}
