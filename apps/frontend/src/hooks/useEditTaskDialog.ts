import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Task, TaskStatus } from '@/types';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | null;

export interface Course {
  id: number;
  code: string;
  name: string | null;
}

interface ExistingSub {
  id: number;
  title: string;
}

interface UseEditTaskDialogProps {
  task: Task;
  isOpen: boolean;
  onSave: (data: {
    title: string;
    dueDate?: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    tags?: string[];
    courseId?: number | null;
    subtasksToAdd: string[];
    subtaskIdsToDelete: number[];
  }) => Promise<void>;
}

const PRIORITY_CYCLE: Priority[] = [null, 'LOW', 'MEDIUM', 'HIGH'];

const PRIORITY_STYLES: Record<Exclude<Priority, null>, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
};

export function useEditTaskDialog({ task, isOpen, onSave }: UseEditTaskDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status] = useState<TaskStatus>(task.status);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    task.dueDate ? new Date(task.dueDate) : null
  );
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const [priority, setPriority] = useState<Priority>((task.priority as Priority) ?? null);
  const [tags, setTags] = useState<string[]>(task.tags ?? []);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [existingSubs, setExistingSubs] = useState<ExistingSub[]>([]);
  const [originalSubIds, setOriginalSubIds] = useState<number[]>([]);
  const [newSubTitles, setNewSubTitles] = useState<string[]>([]);
  const [newSubInput, setNewSubInput] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const onSaveRef = useRef<typeof onSave>(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses', 'enrolled'],
    queryFn: () => api.get<Course[]>('/courses/enrolled'),
    enabled: isOpen,
  });

  const { data: fetchedTaskData } = useQuery({
    queryKey: ['tasks', task.id],
    queryFn: () => api.get<Task & { subtasks: Task[] }>(`/tasks/${task.id}`),
    enabled: isOpen && task.parentId === null,
  });

  useEffect(() => {
    if (courses.length > 0 && task.courseId && isOpen) {
      setSelectedCourse(courses.find((c) => c.id === task.courseId) ?? null);
    }
  }, [courses, task.courseId, isOpen]);

  useEffect(() => {
    if (fetchedTaskData && isOpen && task.parentId === null) {
      const subs = (fetchedTaskData.subtasks ?? []).map((sub) => ({
        id: sub.id,
        title: sub.title,
      }));
      setExistingSubs(subs);
      setOriginalSubIds(subs.map((sub) => sub.id));
    }
  }, [fetchedTaskData, isOpen, task.parentId]);

  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      setTagInputOpen(false);
      setSubtasksExpanded(false);
      return;
    }

    // Snapshot task at open time — do NOT re-run when task updates mid-session
    setTitle(task.title);
    setDescription(task.description ?? '');
    setSelectedDate(task.dueDate ? new Date(task.dueDate) : null);
    setPriority((task.priority as Priority) ?? null);
    setTags(task.tags ?? []);
    setTagInput('');
    setNewSubTitles([]);
    setNewSubInput('');

    if (!task.courseId) {
      setSelectedCourse(null);
    }

    const timeout = setTimeout(() => {
      initializedRef.current = true;
    }, 100);

    return () => {
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // intentionally omit `task` — we only init on open, not on every task update

  useEffect(() => {
    if (tagInputOpen) {
      tagInputRef.current?.focus();
    }
  }, [tagInputOpen]);

  useEffect(() => {
    if (!initializedRef.current || !title.trim() || !selectedDate) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onSaveRef.current({
        title: title.trim(),
        dueDate: selectedDate?.toISOString(),
        description: description.trim() || undefined,
        status,
        priority,
        tags,
        courseId: selectedCourse?.id ?? null,
        subtasksToAdd: [],
        subtaskIdsToDelete: [],
      });
    }, 800);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // onSaveRef is stable — intentionally excluded from deps
  }, [title, description, selectedDate, status, priority, tags, selectedCourse]);

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
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    if (!newSubInput.trim()) return;
    setNewSubTitles((prev) => [...prev, newSubInput.trim()]);
    setNewSubInput('');
  }, [newSubInput]);

  const deletedSubIds = originalSubIds.filter((id) => !existingSubs.some((sub) => sub.id === id));
  const totalSubtasks = existingSubs.length + newSubTitles.length;

  const saveSubtasks = useCallback(async () => {
    if (!title.trim()) return;

    await onSave({
      title: title.trim(),
      dueDate: selectedDate?.toISOString(),
      description: description.trim() || undefined,
      status,
      priority,
      tags,
      courseId: selectedCourse?.id ?? null,
      subtasksToAdd: newSubTitles,
      subtaskIdsToDelete: deletedSubIds,
    });

    setNewSubTitles([]);
  }, [
    description,
    deletedSubIds,
    newSubTitles,
    onSave,
    priority,
    selectedCourse,
    selectedDate,
    status,
    tags,
    title,
  ]);

  return {
    title,
    setTitle,
    description,
    setDescription,
    status,
    selectedDate,
    setSelectedDate,
    isDateOpen,
    setIsDateOpen,
    subtasksExpanded,
    setSubtasksExpanded,
    priority,
    setPriority,
    tags,
    setTags,
    tagInputOpen,
    setTagInputOpen,
    tagInput,
    setTagInput,
    tagInputRef,
    existingSubs,
    setExistingSubs,
    originalSubIds,
    newSubTitles,
    setNewSubTitles,
    newSubInput,
    setNewSubInput,
    selectedCourse,
    setSelectedCourse,
    courses,
    cyclePriority,
    addTag,
    handleTagKeyDown,
    addNewSub,
    saveSubtasks,
    deletedSubIds,
    totalSubtasks,
    PRIORITY_STYLES,
  };
}
