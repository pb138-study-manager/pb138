import { Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LanguageSettingProps {
  language: 'en' | 'cs';
  onChangeLanguage: (lng: 'en' | 'cs') => void;
}

export default function LanguageSetting({ language, onChangeLanguage }: LanguageSettingProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || language;

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        <span className="text-gray-600 dark:text-gray-300 font-medium">
          {t('profile.language')}
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'flex items-center gap-2 text-gray-600 dark:text-gray-300 cursor-pointer focus:outline-none'
          )}
        >
          {currentLang.startsWith('cs') ? 'Čeština' : 'English'}
          <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onChangeLanguage('en')}>English</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChangeLanguage('cs')}>Čeština</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
