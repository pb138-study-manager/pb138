import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/ui/bottom-nav';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import UserCard from '@/components/profile/user-card';
import SettingsCard from '@/components/profile/settings-card';
import { UserSettings } from '@/types';

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
  settings: UserSettings;
};

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userData, isLoading } = useQuery({
    queryKey: ['userMe'],
    queryFn: () => api.get<UserProfileResponse>('/users/me').catch(() => null),
  });

  const { t, i18n } = useTranslation();

  const theme = userData
    ? userData.settings.lightTheme
      ? 'light'
      : 'dark'
    : localStorage.getItem('theme') || 'light';
  const language =
    (userData?.settings.language as 'en' | 'cs') ||
    (localStorage.getItem('language') as 'en' | 'cs') ||
    'en';
  const notificationsEnabled = userData?.settings.notificationsEnabled ?? false;

  const changeLanguage = async (lng: 'en' | 'cs') => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    try {
      await api.patch('/users/me/settings', { language: lng });
      queryClient.setQueryData<UserProfileResponse | null>(['userMe'], (prev) => {
        if (!prev) return prev;
        return { ...prev, settings: { ...prev.settings, language: lng } };
      });
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  };

  const updateSettings = async (key: 'lightTheme' | 'notificationsEnabled', value: boolean) => {
    try {
      await api.patch('/users/me/settings', { [key]: value });
      if (key === 'lightTheme') {
        localStorage.setItem('theme', value ? 'light' : 'dark');
        document.documentElement.classList.toggle('dark', !value);
      }

      queryClient.setQueryData<UserProfileResponse | null>(['userMe'], (prev) => {
        if (!prev) return prev;
        return { ...prev, settings: { ...prev.settings, [key]: value } };
      });
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
        <UserCard login={userData.login} name={userData.profile.name} email={userData.email} />

        <SettingsCard
          theme={theme}
          language={language}
          notificationsEnabled={notificationsEnabled}
          onUpdateSettings={updateSettings}
          onChangeLanguage={changeLanguage}
          onTeachersClick={() => navigate({ to: '/teachers' })}
        />

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
