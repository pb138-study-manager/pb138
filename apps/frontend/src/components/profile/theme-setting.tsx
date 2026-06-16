import { Palette, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeSettingProps {
  theme: string;
  onUpdateSettings: (key: 'lightTheme' | 'notificationsEnabled', value: boolean) => void;
}

export default function ThemeSetting({ theme, onUpdateSettings }: ThemeSettingProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <Palette className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        <span className="text-gray-600 dark:text-gray-300 font-medium">{t('profile.theme')}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'flex items-center gap-2 text-gray-600 dark:text-gray-300 cursor-pointer focus:outline-none'
          )}
        >
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
  );
}
