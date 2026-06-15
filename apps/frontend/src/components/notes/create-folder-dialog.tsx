import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';

export default function CreateFolderDialog({
  isOpen,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [folderName, setFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { t } = useTranslation();

  async function handleSubmit() {
    if (!folderName.trim()) return;
    setIsCreating(true);
    try {
      await onSubmit(folderName.trim());
      setFolderName('');
      onOpenChange(false);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader>
          <DialogTitle className="hidden">{t('dialog.newFolder')}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-6">
          <Input
            placeholder={t('dialog.folderName')}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            autoFocus
            className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-gray-400"
          />
        </div>
        <div className="flex justify-end px-6 pb-5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!folderName.trim() || isCreating}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 disabled:opacity-40 transition-colors"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
