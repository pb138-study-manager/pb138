import { type ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface EntityFormDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  onTitleChange?: (v: string) => void;
  titlePlaceholder?: string;
  children?: ReactNode;
  onSubmit: () => void;
  submitDisabled?: boolean;
}

export function EntityFormDialog({
  open,
  onOpenChange,
  trigger,
  title,
  onTitleChange,
  titlePlaceholder,
  children,
  onSubmit,
  submitDisabled,
}: EntityFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={<span />}>{trigger}</DialogTrigger>}
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit();
        }}
      >
        <div className="px-5 pt-5 pb-3">
          <Input
            value={title}
            onChange={(e) => onTitleChange?.(e.target.value)}
            placeholder={titlePlaceholder ?? 'Title...'}
            className="border-none shadow-none text-lg font-semibold px-0 focus-visible:ring-0 bg-transparent dark:bg-transparent"
            autoFocus
          />
        </div>

        {children && (
          <>
            <div className="border-t border-gray-100 dark:border-gray-800" />
            <div className="px-5 py-3 flex flex-wrap items-center gap-2">{children}</div>
          </>
        )}

        <div className="flex justify-end px-5 py-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled || !title.trim()}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              title.trim() && !submitDisabled
                ? 'bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            )}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
