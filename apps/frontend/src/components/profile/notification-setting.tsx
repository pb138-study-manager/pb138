import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';

interface NotificationSettingProps {
  notificationsEnabled: boolean;
  onUpdateSettings: (key: 'lightTheme' | 'notificationsEnabled', value: boolean) => void;
}

export default function NotificationSetting({
  notificationsEnabled,
  onUpdateSettings,
}: NotificationSettingProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        <span className="text-gray-600 dark:text-gray-300 font-medium">
          {t('profile.notifications')}
        </span>
      </div>
      <Switch
        checked={notificationsEnabled}
        onCheckedChange={(checked) => onUpdateSettings('notificationsEnabled', checked)}
      />
    </div>
  );
}
