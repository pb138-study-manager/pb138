import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
      <DialogContent className="sm:max-w-md p-6 rounded-2xl border-none shadow-xl gap-0 dark:bg-gray-800">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold dark:text-white">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <FolderPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            {t('dialog.newFolder')}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <Input
            placeholder={t('dialog.folderName')}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            autoFocus
            className="text-base py-6 px-4 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus-visible:bg-white dark:focus-visible:bg-gray-600 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all"
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="ghost"
            className="rounded-xl px-5 h-11 font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => onOpenChange(false)}
          >
            {t('dialog.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!folderName.trim() || isCreating}
            className="rounded-xl px-6 h-11 font-medium bg-black dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-300 text-white dark:text-black transition-all"
          >
            {isCreating ? t('dialog.creating') : t('dialog.createFolder')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
