import { Card, CardContent } from '@/components/ui/card';
import ThemeSetting from '@/components/profile/theme-setting';
import LanguageSetting from '@/components/profile/language-setting';

interface SettingsCardProps {
  theme: string;
  language: 'en' | 'cs';
  onUpdateSettings: (key: 'lightTheme' | 'notificationsEnabled', value: boolean) => void;
  onChangeLanguage: (lng: 'en' | 'cs') => void;
}

export default function SettingsCard({
  theme,
  language,
  onUpdateSettings,
  onChangeLanguage,
}: SettingsCardProps) {
  return (
    <Card className="border-0 rounded-3xl shadow-md dark:bg-gray-800 transition-colors overflow-hidden">
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <ThemeSetting theme={theme} onUpdateSettings={onUpdateSettings} />

          <LanguageSetting language={language} onChangeLanguage={onChangeLanguage} />
        </div>
      </CardContent>
    </Card>
  );
}
