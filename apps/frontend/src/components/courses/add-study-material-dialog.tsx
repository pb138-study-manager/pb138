import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type NewStudyMaterialPayload = {
  title: string;
  description: string | null;
  url: string | null;
};

const schema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string(),
  url: z.string().refine(
    (v) => !v.trim() || v.startsWith('http://') || v.startsWith('https://'),
    { message: 'Enter a valid URL (must start with http:// or https://)' }
  ),
});

type StudyMaterialForm = z.infer<typeof schema>;

type AddStudyMaterialDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: NewStudyMaterialPayload) => void;
};

export function AddStudyMaterialDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddStudyMaterialDialogProps) {
  const titleId = useId();
  const descId = useId();
  const urlId = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<StudyMaterialForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { title: '', description: '', url: '' },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  function onFormSubmit(data: StudyMaterialForm) {
    const description = data.description.trim();
    const url = data.url.trim();
    onSubmit({
      title: data.title.trim(),
      description: description.length ? description : null,
      url: url.length ? url : null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add study material</DialogTitle>
          <DialogDescription>
            Everyone enrolled in the course will see this material.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor={titleId}>Title</Label>
              <Input id={titleId} placeholder="e.g. Lecture 3 — REST API" {...register('title')} />
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={descId}>Description (optional)</Label>
              <textarea
                id={descId}
                placeholder="Short summary or instructions"
                rows={3}
                className={cn(
                  'min-h-[4.5rem] w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm',
                  'placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  'dark:bg-input/30'
                )}
                {...register('description')}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={urlId}>Link (optional)</Label>
              <Input
                id={urlId}
                type="url"
                placeholder="https://…"
                {...register('url')}
              />
              {errors.url && (
                <p className="text-xs text-red-500">{errors.url.message}</p>
              )}
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
