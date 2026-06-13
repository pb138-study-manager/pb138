import { useState } from 'react';
import { Plus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { Task, TaskStatus } from '@/types';
import TaskCard from '@/components/tasks/tasks-card';

export default function StudentTasksTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');

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
        title: newTaskTitle.trim(),
        dueDate: newTaskDate,
        courseId: Number(courseId),
      }),
    onSuccess: () => {
      setNewTaskTitle('');
      setNewTaskDate('');
      setShowNewTask(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  async function createTask() {
    if (!newTaskTitle.trim() || !newTaskDate) return;
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
          onClick={() => setShowNewTask(true)}
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

      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-8">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('tasks.newTask', 'New task')}
            </h2>
            <input
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder={t('tasks.titlePlaceholder', 'Task title')}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              autoFocus
            />
            <input
              type="datetime-local"
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setShowNewTask(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                className="flex-1"
                onClick={createTask}
                disabled={createTaskMutation.isPending || !newTaskTitle.trim() || !newTaskDate}
              >
                {createTaskMutation.isPending
                  ? t('common.saving', 'Saving…')
                  : t('tasks.add', 'Add task')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
