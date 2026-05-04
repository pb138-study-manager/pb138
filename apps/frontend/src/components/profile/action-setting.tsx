import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

interface ActionSettingProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

export default function ActionSetting({ icon, label, onClick }: ActionSettingProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="w-full h-auto flex items-center justify-between px-6 py-4 rounded-none hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-normal focus-visible:ring-0 focus-visible:bg-gray-50 dark:focus-visible:bg-gray-700"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-gray-600 dark:text-gray-300 font-medium">
          {label === 'Profile' ? label + ' & Settings' : label}
        </span>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
    </Button>
  );
}
