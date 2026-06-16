import { useId, useState } from 'react';
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setUrl('');
  };

  const handleSubmit = () => {
    const t = title.trim();
    if (!t) return;
    const u = url.trim();
    const d = description.trim();
    onSubmit({
      title: t,
      description: d.length ? d : null,
      url: u.length ? u : null,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add study material</DialogTitle>
          <DialogDescription>
            Everyone enrolled in the course will see this material. You can connect this to the
            backend later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor={titleId}>Title</Label>
            <Input
              id={titleId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lecture 3 — REST API"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={descId}>Description (optional)</Label>
            <textarea
              id={descId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary or instructions"
              rows={3}
              className={cn(
                'min-h-[4.5rem] w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm',
                'placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'dark:bg-input/30'
              )}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={urlId}>Link (optional)</Label>
            <Input
              id={urlId}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>
        <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!title.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
