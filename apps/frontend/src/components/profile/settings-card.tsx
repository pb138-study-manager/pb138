import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Palette, Globe, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SettingsCardProps {
  theme: string;
  language: 'en' | 'cs';
  notificationsEnabled: boolean;
  onUpdateSettings: (key: 'lightTheme' | 'notificationsEnabled', value: boolean) => void;
  onChangeLanguage: (lng: 'en' | 'cs') => void;
  onTeachersClick: () => void;
}

export default function SettingsCard({
  theme,
  language,
  notificationsEnabled,
  onUpdateSettings,
  onChangeLanguage,
  onTeachersClick,
}: SettingsCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-0 rounded-3xl shadow-md dark:bg-gray-800 transition-colors">
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {/* Theme */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {t('profile.theme')}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 text-gray-600 dark:text-gray-300 cursor-pointer text-sm transition-colors focus:outline-none">
                {theme === 'light' ? t('profile.light') : t('profile.dark')}
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onUpdateSettings('lightTheme', true)}>
                  {t('profile.light')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateSettings('lightTheme', false)}>
                  {t('profile.dark')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {t('profile.language')}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 text-gray-600 dark:text-gray-300 cursor-pointer text-sm transition-colors focus:outline-none">
                {language === 'en' ? 'English' : 'Čeština'}
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onChangeLanguage('en')}>English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeLanguage('cs')}>Čeština</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {t('profile.notifications')}
              </span>
            </div>
            <button
              onClick={() => onUpdateSettings('notificationsEnabled', !notificationsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationsEnabled
                  ? 'bg-gray-400 dark:bg-gray-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Integrations */}
          <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-3">
              <Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {t('profile.integrations')}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>

          {/* Teachers */}
          <button
            onClick={onTeachersClick}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded border-2 border-gray-600 dark:border-gray-300 flex items-center justify-center gap-0.5">
                <div className="w-1 h-1 rounded-full bg-gray-600 dark:bg-gray-300" />
                <div className="w-1 h-1 rounded-full bg-gray-600 dark:bg-gray-300" />
                <div className="w-1 h-1 rounded-full bg-gray-600 dark:bg-gray-300" />
                <div className="w-1 h-1 rounded-full bg-gray-600 dark:bg-gray-300" />
              </div>
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {t('profile.teachers')}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
