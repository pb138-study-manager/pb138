import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';

const schema = z.object({
  title: z.string().min(1, { message: 'Note title is required' }),
});

type NoteForm = z.infer<typeof schema>;

export default function CreateNoteDialog({
  isOpen,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string) => Promise<void>;
}) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isValid },
  } = useForm<NoteForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  async function onFormSubmit(data: NoteForm) {
    await onSubmit(data.title.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader>
          <DialogTitle className="hidden">{t('dialog.newNote')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="px-6 py-6">
            <Input
              placeholder={t('dialog.noteTitle')}
              {...register('title')}
              autoFocus
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-gray-400"
            />
          </div>
          <div className="flex justify-end px-6 pb-5">
            <button
              type="submit"
              aria-label={t('notes.createNote')}
              disabled={!isValid || isSubmitting}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 disabled:opacity-40 transition-colors"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
