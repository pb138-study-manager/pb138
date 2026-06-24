import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | null;

export interface Course {
  id: number;
  code: string;
  name: string | null;
}

const PRIORITY_CYCLE: Priority[] = [null, 'LOW', 'MEDIUM', 'HIGH'];

export const PRIORITY_STYLES: Record<Exclude<Priority, null>, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
};

const schema = z.object({
  title: z.string().min(1, { message: 'Task name is required' }),
});

type TaskForm = z.infer<typeof schema>;

interface UseNewTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    title: string,
    dueDate: string | undefined,
    subtasks: string[],
    description?: string,
    courseId?: number,
    priority?: Priority,
    tags?: string[]
  ) => Promise<void>;
}

export function useNewTaskDialog({ isOpen, onOpenChange, onSubmit }: UseNewTaskDialogProps) {
  const {
    register,
    handleSubmit: rhfHandleSubmit,
    reset: resetForm,
    formState: { isValid },
  } = useForm<TaskForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { title: '' },
  });

  const [isDateOpen, setIsDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const tagInputRef = useRef<HTMLInputElement>(null);

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses', 'enrolled'],
    queryFn: () => api.get<Course[]>('/courses/enrolled'),
    enabled: isOpen,
  });

  const resetAll = useCallback(() => {
    resetForm({ title: '' });
    setSelectedDate(new Date());
    setSubtasks([]);
    setSelectedCourse(null);
    setPriority(null);
    setTags([]);
    setTagInputOpen(false);
    setTagInput('');
    setIsDateOpen(false);
    setIsSubtasksOpen(false);
  }, [resetForm]);

  const mutation = useMutation({
    mutationFn: async (data: TaskForm) => {
      await onSubmit(
        data.title.trim(),
        selectedDate?.toISOString() ?? undefined,
        subtasks,
        undefined,
        selectedCourse?.id,
        priority,
        tags
      );
    },
    onSuccess: () => {
      resetAll();
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!isOpen) resetAll();
  }, [isOpen, resetAll]);

  useEffect(() => {
    if (tagInputOpen) tagInputRef.current?.focus();
  }, [tagInputOpen]);

  const cyclePriority = useCallback(() => {
    const index = PRIORITY_CYCLE.indexOf(priority);
    setPriority(PRIORITY_CYCLE[(index + 1) % PRIORITY_CYCLE.length]);
  }, [priority]);

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || tags.length >= 20 || tags.includes(trimmed) || trimmed.length > 50) return;
      setTags((prev) => [...prev, trimmed]);
    },
    [tags]
  );

  const handleTagKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(tagInput);
        setTagInput('');
      } else if (e.key === 'Escape') {
        setTagInputOpen(false);
        setTagInput('');
      }
    },
    [addTag, tagInput]
  );

  const addNewSub = useCallback(() => {
    if (!tagInput.trim()) return;
    setSubtasks((prev) => [...prev, tagInput.trim()]);
    setTagInput('');
  }, [tagInput]);

  const handleSubmit = useCallback(
    () => rhfHandleSubmit((data) => mutation.mutateAsync(data))(),
    [rhfHandleSubmit, mutation]
  );

  return {
    register,
    isValid,
    isDateOpen,
    setIsDateOpen,
    selectedDate,
    setSelectedDate,
    isSubtasksOpen,
    setIsSubtasksOpen,
    subtasks,
    setSubtasks,
    saving: mutation.isPending,
    priority,
    setPriority,
    tags,
    setTags,
    tagInputOpen,
    setTagInputOpen,
    tagInput,
    setTagInput,
    tagInputRef,
    selectedCourse,
    setSelectedCourse,
    courses,
    cyclePriority,
    addTag,
    handleTagKeyDown,
    addNewSub,
    handleSubmit,
    PRIORITY_STYLES,
  };
}
