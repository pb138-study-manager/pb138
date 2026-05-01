import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Palette, Globe, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import BottomNav from '@/components/ui/bottom-nav';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/profile/')({
  component: ProfilePage,
});

type UserProfileResponse = {
  id: number;
  email: string;
  login: string;
  roles: string[];
  profile: {
    name: string | null;
    title: string | null;
    organization: string | null;
    bio: string | null;
  };
  settings: { notificationsEnabled: boolean; lightTheme: boolean };
};

function ProfilePage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState<'en' | 'cs'>(
    (localStorage.getItem('language') as 'en' | 'cs') || 'en'
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const changeLanguage = (lng: 'en' | 'cs') => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    api
      .get<UserProfileResponse>('/users/me')
      .then((data) => {
        setUserData(data);
        setTheme(data.settings.lightTheme ? 'light' : 'dark');
        localStorage.setItem('theme', data.settings.lightTheme ? 'light' : 'dark');
        setNotificationsEnabled(data.settings.notificationsEnabled);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const updateSettings = async (key: 'lightTheme' | 'notificationsEnabled', value: boolean) => {
    try {
      await api.patch('/users/me/settings', { [key]: value });
      if (key === 'lightTheme') {
        setTheme(value ? 'light' : 'dark');
        localStorage.setItem('theme', value ? 'light' : 'dark');
      }
      if (key === 'notificationsEnabled') setNotificationsEnabled(value);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (e) {
      console.error('Failed to logout on backend', e);
    }
    localStorage.removeItem('token');
    navigate({ to: '/login' });
  };

  const handleTeachersClick = () => {
    navigate({ to: '/teachers' });
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full bg-white dark:bg-gray-900 flex items-center justify-center transition-colors">
        <p className="text-gray-400 dark:text-gray-500">{t('profile.loading')}</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex-1 w-full bg-white dark:bg-gray-900 flex items-center justify-center transition-colors">
        <p className="text-gray-400 dark:text-gray-500">{t('profile.failed')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 transition-colors">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('profile.title')}</h1>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-4">
        {/* User Card */}
        <Card className="border-0 rounded-3xl shadow-md dark:bg-gray-800 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.login}`}
                alt={userData.profile.name || userData.login}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userData.profile.name || userData.login}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">{userData.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
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
                  <DropdownMenuTrigger>
                    <button className="flex items-center gap-2 text-gray-600 dark:text-gray-300 cursor-pointer text-sm transition-colors">
                      {theme === 'light' ? t('profile.light') : t('profile.dark')}
                      <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => updateSettings('lightTheme', true)}>
                      {t('profile.light')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateSettings('lightTheme', false)}>
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
                  <DropdownMenuTrigger>
                    <button className="flex items-center gap-2 text-gray-600 dark:text-gray-300 cursor-pointer text-sm transition-colors">
                      {language === 'en' ? 'English' : 'Čeština'}
                      <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => changeLanguage('en')}>
                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeLanguage('cs')}>
                      Čeština
                    </DropdownMenuItem>
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
                  onClick={() => updateSettings('notificationsEnabled', !notificationsEnabled)}
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
                onClick={handleTeachersClick}
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

        {/* Log Out Button */}
        <Button
          onClick={handleLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-6 rounded-2xl text-lg"
        >
          {t('profile.logout')}
        </Button>
      </div>
      <BottomNav active="profile" />
    </div>
  );
}
