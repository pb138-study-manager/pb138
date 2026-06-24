import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { Task, TaskStatus } from '@/types';
import TaskCard from '@/components/tasks/tasks-card';
import { EntityFormDialog } from '@/components/shared/entity-form-dialog';

const taskSchema = z.object({
  title: z.string().min(1, { message: 'Task title is required' }),
  dueDate: z.string().min(1, { message: 'Due date is required' }),
});

type TaskForm = z.infer<typeof taskSchema>;

export default function StudentTasksTab({
  courseId,
  addOpen,
  onAddOpenChange,
  filterTags,
}: {
  courseId: string;
  addOpen?: boolean;
  onAddOpenChange?: (v: boolean) => void;
  filterTags?: Set<string>;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showAddInternal, setShowAddInternal] = useState(false);
  const showAdd = addOpen !== undefined ? addOpen : showAddInternal;
  const setShowAdd = onAddOpenChange ?? setShowAddInternal;

  const {
    watch,
    setValue,
    reset: resetForm,
    handleSubmit: rhfHandleSubmit,
    register,
    formState: { isValid },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    mode: 'onChange',
    defaultValues: { title: '', dueDate: '' },
  });

  const taskTitle = watch('title');

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').catch(() => []),
  });

  const allCourseTasks = allTasks.filter((t) => t.courseId === Number(courseId));
  const tasks =
    filterTags && filterTags.size > 0
      ? allCourseTasks.filter((t) => t.tags?.some((tag) => filterTags.has(tag)))
      : allCourseTasks;

  const toggleTaskMutation = useMutation({
    mutationFn: (id: number) => api.patch<Task>(`/tasks/${id}/toggle-done`, {}),
    onSuccess: (updated) => {
      queryClient.setQueryData<Task[]>(['tasks'], (prev = []) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
    },
  });

  async function handleToggle(id: number) {
    toggleTaskMutation.mutate(id);
  }

  const editTaskMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      subtasksToAdd,
      subtaskIdsToDelete,
    }: {
      id: number;
      data: {
        title: string;
        dueDate?: string;
        description?: string;
        status?: TaskStatus;
        priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
        tags?: string[];
        courseId?: number | null;
      };
      subtasksToAdd: string[];
      subtaskIdsToDelete: number[];
    }) => {
      await Promise.all([
        api.patch<Task>(`/tasks/${id}`, data),
        ...subtaskIdsToDelete.map((subId: number) => api.delete(`/tasks/${subId}`)),
      ]);
      await Promise.all(
        subtasksToAdd.map((title: string) =>
          api.post<Task>('/tasks', { title, dueDate: data.dueDate, parentId: id })
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  async function handleEditFull(
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
  ) {
    editTaskMutation.mutate({ id, data, subtasksToAdd, subtaskIdsToDelete });
  }

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: (_, id) =>
      queryClient.setQueryData<Task[]>(['tasks'], (prev = []) => prev.filter((t) => t.id !== id)),
  });

  async function handleDelete(id: number) {
    deleteTaskMutation.mutate(id);
  }

  const createTaskMutation = useMutation({
    mutationFn: (data: TaskForm) =>
      api.post<Task>('/tasks', {
        title: data.title.trim(),
        dueDate: data.dueDate,
        courseId: Number(courseId),
      }),
    onSuccess: () => {
      resetForm();
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleCreate = rhfHandleSubmit((data) => createTaskMutation.mutate(data));

  return (
    <div className="px-4 mt-6 mb-6">
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          {t('courses.noTasks', 'No tasks for this course')}
        </p>
      ) : (
        <div className="space-y-6">
          {tasks.filter((t) => t.assignmentId !== null).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {t('courses.assigned', 'Assigned')}
              </p>
              {tasks
                .filter((t) => t.assignmentId !== null)
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onEditFull={handleEditFull}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          )}
          {tasks.filter((t) => t.assignmentId === null).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {t('courses.createdByMe', 'Created by me')}
              </p>
              {tasks
                .filter((t) => t.assignmentId === null)
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onEditFull={handleEditFull}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      <EntityFormDialog
        open={showAdd}
        onOpenChange={(open) => {
          setShowAdd(open);
          if (!open) resetForm();
        }}
        title={taskTitle}
        onTitleChange={(v) => setValue('title', v, { shouldValidate: true })}
        titlePlaceholder={t('tasks.titlePlaceholder', 'Task title')}
        submitDisabled={createTaskMutation.isPending || !isValid}
        onSubmit={handleCreate}
      >
        <input
          type="datetime-local"
          {...register('dueDate')}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 text-sm outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
        />
      </EntityFormDialog>
    </div>
  );
}
