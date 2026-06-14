import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Task, TaskStatus } from '@/types';

export type TaskCardEditData = {
  title: string;
  dueDate?: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  tags?: string[];
  courseId?: number | null;
  subtasksToAdd: string[];
  subtaskIdsToDelete: number[];
};

interface UseTaskCardProps {
  task: Task;
  onToggle: (id: number) => Promise<void>;
  onEditFull: (
    id: number,
    data: {
      title: string;
      dueDate?: string;
      description?: string;
      status?: TaskStatus;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
      tags?: string[];
      courseId?: number | null;
    },
    subtasksToAdd: string[],
    subtaskIdsToDelete: number[]
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  indent?: boolean;
}

export function useTaskCard({ task, onToggle, onEditFull, onDelete, indent }: UseTaskCardProps) {
  const [isChecked, setIsChecked] = useState(task.status === 'DONE');
  const [toggling, setToggling] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [subtasksLoaded, setSubtasksLoaded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: fetchedSubtasks = [], isSuccess: fetchedSubtasksLoaded } = useQuery({
    queryKey: ['tasks', task.id, 'subtasks'],
    queryFn: async () => {
      const data = await api.get<Task & { subtasks: Task[] }>(`/tasks/${task.id}`);
      return data.subtasks ?? [];
    },
    enabled: !indent && subtasksOpen && !subtasksLoaded,
  });

  useEffect(() => {
    if (fetchedSubtasksLoaded && !subtasksLoaded) {
      setSubtasks(fetchedSubtasks);
      setSubtasksLoaded(true);
    }
  }, [fetchedSubtasksLoaded, fetchedSubtasks, subtasksLoaded]);

  useEffect(() => {
    setIsChecked(task.status === 'DONE');
  }, [task.status]);

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    setIsChecked((prev) => !prev);

    try {
      await onToggle(task.id);
    } catch {
      setIsChecked((prev) => !prev);
    } finally {
      setToggling(false);
    }
  }

  async function handleSubToggle(subId: number) {
    await onToggle(subId);
    setSubtasks((prev) =>
      prev.map((sub) =>
        sub.id === subId ? { ...sub, status: sub.status === 'DONE' ? 'TODO' : 'DONE' } : sub
      )
    );
  }

  async function handleSubDelete(subId: number) {
    await onDelete(subId);
    setSubtasks((prev) => prev.filter((sub) => sub.id !== subId));
  }

  async function handleSubEditFull(
    subId: number,
    data: {
      title: string;
      dueDate?: string;
      description?: string;
      status?: TaskStatus;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
      tags?: string[];
      courseId?: number | null;
    },
    subtasksToAdd: string[],
    subtaskIdsToDelete: number[]
  ) {
    await onEditFull(subId, data, subtasksToAdd, subtaskIdsToDelete);
    setSubtasks((prev) =>
      prev.map((sub) =>
        sub.id === subId
          ? {
              ...sub,
              title: data.title,
              dueDate: data.dueDate ?? null,
              description: data.description ?? sub.description,
              status: data.status ?? sub.status,
            }
          : sub
      )
    );
  }

  async function handleSave(data: TaskCardEditData) {
    await onEditFull(
      task.id,
      {
        title: data.title,
        dueDate: data.dueDate,
        description: data.description,
        status: data.status,
        priority: data.priority,
        tags: data.tags,
        courseId: data.courseId,
      },
      data.subtasksToAdd,
      data.subtaskIdsToDelete
    );

    setSubtasksLoaded(false);
    setSubtasks([]);
  }

  return {
    isChecked,
    toggling,
    subtasksOpen,
    setSubtasksOpen,
    subtasks,
    subtasksLoaded,
    editOpen,
    setEditOpen,
    handleToggle,
    handleSubToggle,
    handleSubDelete,
    handleSubEditFull,
    handleSave,
  };
}
