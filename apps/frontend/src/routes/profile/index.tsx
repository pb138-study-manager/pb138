import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/ui/bottom-nav';
import { useTranslation } from 'react-i18next';
import UserCard from '@/components/profile/user-card';
import SettingsCard from '@/components/profile/settings-card';
import { useProfileManager } from '@/hooks/useProfileManager';

export const Route = createFileRoute('/profile/')({
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useTranslation();
  const {
    userData,
    isPending,
    theme,
    language,
    notificationsEnabled,
    changeLanguage,
    updateSettings,
    handleLogout,
  } = useProfileManager();

  if (isPending) {
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
