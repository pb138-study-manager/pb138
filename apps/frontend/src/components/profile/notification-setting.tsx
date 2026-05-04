import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
      <button
        onClick={() => onUpdateSettings('notificationsEnabled', !notificationsEnabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          notificationsEnabled ? 'bg-gray-400 dark:bg-gray-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
            notificationsEnabled ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
