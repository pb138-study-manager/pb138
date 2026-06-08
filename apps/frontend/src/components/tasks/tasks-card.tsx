import { useState, useEffect } from 'react';
import { Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { Task, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import EditTaskDialog from '@/components/tasks/edit-task-dialog';
import { getUrgency, getCountdown } from '@/lib/task-utils';

type EditData = {
  title: string;
  dueDate: string;
  description?: string;
  status?: TaskStatus;
  subtasksToAdd: string[];
  subtaskIdsToDelete: number[];
};

export default function TaskCard({
  task,
  onToggle,
  onEditFull,
  onDelete,
  indent = false,
}: {
  task: Task;
  onToggle: (id: number) => Promise<void>;
  onEditFull: (
    id: number,
    data: { title: string; dueDate: string; description?: string; status?: TaskStatus },
    subtasksToAdd: string[],
    subtaskIdsToDelete: number[]
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  indent?: boolean;
}) {
  const [isChecked, setIsChecked] = useState(task.status === 'DONE');
  const [toggling, setToggling] = useState(false);
  const [deleting] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [subtasksLoaded, setSubtasksLoaded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setIsChecked(task.status === 'DONE');
  }, [task.status]);

  // Load subtasks when expanded
  useEffect(() => {
    if (indent || !subtasksOpen || subtasksLoaded) return;
    api
      .get<Task & { subtasks: Task[] }>(`/tasks/${task.id}`)
      .then((data) => {
        setSubtasks(data.subtasks ?? []);
        setSubtasksLoaded(true);
      })
      .catch(() => { setSubtasksLoaded(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtasksOpen, task.id, indent]);

  const dueTime = task.dueDate
    ? `${t('tasks.due')} ${new Date(task.dueDate).toLocaleString('sk-SK', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : t('tasks.noDueDate');
  const hasUsers = task.assignmentId !== null;
  const urgency = getUrgency(task.dueDate);
  const countdown = getCountdown(task.dueDate, t('tasks.noDate'));
  const urgencyColors = {
    high: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    low: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  };

  const effectiveDone = subtasksLoaded
    ? subtasks.filter((s) => s.status === 'DONE').length
    : (task.doneSubtaskCount ?? 0);
  const effectiveTotal = subtasksLoaded ? subtasks.length : (task.subtaskCount ?? 0);
  const progressPercent = effectiveTotal > 0 ? (effectiveDone / effectiveTotal) * 100 : 0;

  async function handleToggle() {
    if (toggling || deleting) return;
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

  // Handlers passed down to subtask cards
  async function handleSubToggle(subId: number) {
    await onToggle(subId);
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status: s.status === 'DONE' ? 'TODO' : 'DONE' } : s))
    );
  }

  async function handleSubDelete(subId: number) {
    await onDelete(subId);
    setSubtasks((prev) => prev.filter((s) => s.id !== subId));
  }

  async function handleSubEditFull(
    subId: number,
    data: { title: string; dueDate: string; description?: string; status?: TaskStatus },
    subtasksToAdd: string[],
    subtaskIdsToDelete: number[]
  ) {
    await onEditFull(subId, data, subtasksToAdd, subtaskIdsToDelete);
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === subId
          ? { ...s, title: data.title, dueDate: data.dueDate, description: data.description ?? s.description, status: data.status ?? s.status }
          : s
      )
    );
  }

  async function handleSave(data: EditData) {
    await onEditFull(
      task.id,
      { title: data.title, dueDate: data.dueDate, description: data.description, status: data.status },
      data.subtasksToAdd,
      data.subtaskIdsToDelete
    );
    setSubtasksLoaded(false);
    setSubtasks([]);
  }

  return (
    <>
      <div
        className={cn(
          'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl mb-2 shadow-sm hover:shadow-md transition-shadow',
          indent && 'ml-6'
        )}
      >
        <div className="p-4 flex items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-xl shrink-0">
            {hasUsers ? (
              <Users className="w-4 h-4 text-blue-500" />
            ) : (
              <Clock className="w-4 h-4 text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0" onClick={() => setEditOpen(true)}>
            <p
              className={cn(
                'font-bold text-sm truncate cursor-pointer transition-all duration-300',
                isChecked ? 'line-through text-gray-400 opacity-50' : 'text-gray-900 dark:text-white'
              )}
            >
              {task.title}
            </p>
            <p className="text-[13px] text-gray-400 mt-0.5 truncate">{dueTime}</p>
            {task.status !== 'DONE' && countdown && (
              <span
                className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  urgency ? urgencyColors[urgency] : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {countdown}
              </span>
            )}
            {effectiveTotal > 0 && (
              <div className="mt-1.5">
                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 dark:bg-blue-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-blue-500 font-medium mt-0.5 block">
                  {effectiveDone}/{effectiveTotal} subtasks
                </span>
              </div>
            )}
          </div>
          <button onClick={handleToggle} disabled={toggling || deleting} className="shrink-0 ml-1">
            {isChecked ? (
              <div className="w-7 h-7 rounded-full border-2 border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-500" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full border-2 border-gray-300 dark:border-gray-600" />
            )}
          </button>
        </div>

        {/* Subtasks toggle */}
        {!indent && effectiveTotal > 0 && (
          <div className="px-5 pb-3">
            <button
              onClick={() => setSubtasksOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              {subtasksOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {subtasksLoaded
                ? `${subtasks.length} subtask${subtasks.length !== 1 ? 's' : ''}`
                : 'Subtasks'}
            </button>
          </div>
        )}
      </div>

      {/* Subtask cards rendered outside parent card, at same level but indented */}
      {!indent &&
        subtasksOpen &&
        subtasks.map((sub) => (
          <TaskCard
            key={sub.id}
            task={sub}
            indent
            onToggle={handleSubToggle}
            onEditFull={handleSubEditFull}
            onDelete={handleSubDelete}
          />
        ))}

      <EditTaskDialog
        task={task}
        isOpen={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleSave}
      />
    </>
  );
}
