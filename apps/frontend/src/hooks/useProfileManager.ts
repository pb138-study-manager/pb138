import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { UserSettings } from '@/types';

export type UserProfileResponse = {
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

export function useProfileManager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();

  const { data: userData, isPending } = useQuery({
    queryKey: ['userMe'],
    queryFn: () => api.get<UserProfileResponse>('/users/me').catch(() => null),
  });

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

  return {
    userData,
    isPending,
    theme,
    language,
    notificationsEnabled,
    changeLanguage,
    updateSettings,
    handleLogout,
  };
}