import { useId, useMemo, useState } from 'react';
import type { CourseStudent } from '@/types/index';
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

export type TaskAssignScope = 'all' | 'one';

export type NewCourseTaskPayload = {
  title: string;
  dueLabel: string;
  subject: string | null;
  target: TaskAssignScope;
  studentId: number | null;
};

type AddCourseTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: CourseStudent[];
  defaultSubject?: string;
  onSubmit: (payload: NewCourseTaskPayload) => void;
};

export function AddCourseTaskDialog({
  open,
  onOpenChange,
  students,
  defaultSubject = 'PB138',
  onSubmit,
}: AddCourseTaskDialogProps) {
  const titleId = useId();
  const dueId = useId();
  const timeId = useId();
  const subjectId = useId();
  const selectId = useId();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [subject, setSubject] = useState(defaultSubject);
  const [scope, setScope] = useState<TaskAssignScope>('all');
  const [studentId, setStudentId] = useState<number>(() => students[0]?.id ?? 0);

  const studentOptions = useMemo(() => students, [students]);

  const reset = () => {
    setTitle('');
    setDueDate('');
    setDueTime('23:59');
    setSubject(defaultSubject);
    setScope('all');
    setStudentId(students[0]?.id ?? 0);
  };

  const handleSubmit = () => {
    const t = title.trim();
    if (!t || !dueDate) return;
    if (scope === 'one' && !studentId) return;

    const dueLabel = `${dueDate} ${dueTime} · ${subject.trim() || defaultSubject}`;

    onSubmit({
      title: t,
      dueLabel,
      subject: subject.trim() || null,
      target: scope,
      studentId: scope === 'one' ? studentId : null,
    });
    reset();
    onOpenChange(false);
  };

  const scopeBtn = (value: TaskAssignScope, label: string) => (
    <Button
      type="button"
      variant={scope === value ? 'default' : 'outline'}
      className="flex-1 text-sm"
      onClick={() => setScope(value)}
    >
      {label}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add course task</DialogTitle>
          <DialogDescription>
            Choose whether every student in the course receives the task, or only one specific student.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor={titleId}>Task title</Label>
            <Input
              id={titleId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement the signup form"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor={dueId}>Due date</Label>
              <Input id={dueId} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={timeId}>Time</Label>
              <Input id={timeId} type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={subjectId}>Subject / label</Label>
            <Input
              id={subjectId}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={defaultSubject}
            />
          </div>
          <div className="grid gap-2">
            <Label>Assign to</Label>
            <div className="flex gap-2">
              {scopeBtn('all', 'Everyone')}
              {scopeBtn('one', 'One student')}
            </div>
          </div>
          {scope === 'one' && (
            <div className="grid gap-1.5">
              <Label htmlFor={selectId}>Student</Label>
              <select
                id={selectId}
                className={cn(
                  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm',
                  'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'
                )}
                value={studentId}
                onChange={(e) => setStudentId(Number(e.target.value))}
              >
                {studentOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.login})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || !dueDate || (scope === 'one' && !studentOptions.length)}
          >
            Add task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
