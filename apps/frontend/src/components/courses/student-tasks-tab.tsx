import { useState } from 'react';
import { Plus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { Task, TaskStatus } from '@/types';
import TaskCard from '@/components/tasks/tasks-card';
import { EntityFormDialog } from '@/components/shared/EntityFormDialog';

export default function StudentTasksTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState('');

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').catch(() => []),
  });

  const tasks = allTasks.filter((t) => t.courseId === Number(courseId));

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
    mutationFn: () =>
      api.post<Task>('/tasks', {
        title: taskTitle.trim(),
        dueDate: taskDate,
        courseId: Number(courseId),
      }),
    onSuccess: () => {
      setTaskTitle('');
      setTaskDate('');
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  function handleCreate() {
    if (!taskTitle.trim() || !taskDate) return;
    createTaskMutation.mutate();
  }

  return (
    <div className="px-4 mt-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-green-500" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {t('courses.tasks', 'Tasks')}
          </span>
          <span className="text-gray-400 text-sm">{tasks.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </Button>
      </div>

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
          if (!open) {
            setTaskTitle('');
            setTaskDate('');
          }
        }}
        title={taskTitle}
        onTitleChange={setTaskTitle}
        titlePlaceholder={t('tasks.titlePlaceholder', 'Task title')}
        submitDisabled={createTaskMutation.isPending || !taskDate}
        onSubmit={handleCreate}
      >
        <input
          type="datetime-local"
          value={taskDate}
          onChange={(e) => setTaskDate(e.target.value)}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 text-sm outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
        />
      </EntityFormDialog>
    </div>
  );
}
