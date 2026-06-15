import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MAX_SIZE = 256 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

interface AvatarUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<void>;
}

export default function AvatarUploadDialog({ open, onOpenChange, onUpload }: AvatarUploadDialogProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('profile.avatarErrorType'));
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(t('profile.avatarErrorSize'));
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    try {
      await onUpload(selectedFile);
      handleClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? t('profile.avatarErrorType');
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('profile.avatarDialogTitle')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('profile.avatarInfo')}
          </p>

          <div
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-6 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover ring-2 ring-indigo-500"
              />
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <ImageIcon className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('profile.avatarClickToSelect')}
                </p>
              </>
            )}
            {selectedFile && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleFileChange}
          />

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isUploading ? t('profile.avatarUploading') : t('profile.avatarUpload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
