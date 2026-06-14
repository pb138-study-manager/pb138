import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
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
  const [taskName, setTaskName] = useState('');
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

  const reset = useCallback(() => {
    setTaskName('');
    setSelectedDate(new Date());
    setSubtasks([]);
    setSelectedCourse(null);
    setPriority(null);
    setTags([]);
    setTagInputOpen(false);
    setTagInput('');
    setIsDateOpen(false);
    setIsSubtasksOpen(false);
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      await onSubmit(
        taskName.trim(),
        selectedDate?.toISOString() ?? undefined,
        subtasks,
        undefined,
        selectedCourse?.id,
        priority,
        tags
      );
    },
    onSuccess: () => {
      reset();
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (tagInputOpen) {
      tagInputRef.current?.focus();
    }
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

  const handleSubmit = useCallback(async () => {
    if (!taskName.trim()) return;
    await mutation.mutateAsync();
  }, [mutation, taskName]);

  return {
    taskName,
    setTaskName,
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
