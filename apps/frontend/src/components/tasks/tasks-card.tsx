import { useState, useEffect } from 'react';
import { Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { Task, TaskStatus } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import EditTaskDialog from '@/components/tasks/edit-task-dialog';

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
  const [deleting, setDeleting] = useState(false);
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
    ? `${t('tasks.due')} ${new Date(task.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : t('tasks.noDueDate');
  const subject = task.description || t('tasks.noDescription');
  const hasUsers = task.assignmentId !== null;

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

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
    } catch {
      setDeleting(false);
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
    _add: string[],
    _del: number[]
  ) {
    await onEditFull(subId, data, [], []);
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
      <div className={cn(
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 hover:shadow-sm dark:hover:shadow-gray-900 transition-shadow',
        indent && 'ml-6 border-l-2 border-l-blue-200 dark:border-l-blue-800'
      )}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h4
              onClick={() => setEditOpen(true)}
              className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {task.title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              {hasUsers && <Users className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
              <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {dueTime} · {subject}
              </p>
            </div>
            {effectiveTotal > 0 && (
              <div className="mt-1.5">
                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 dark:bg-blue-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-blue-500 dark:text-blue-400 font-medium mt-0.5 block">
                  {effectiveDone}/{effectiveTotal}
                </span>
              </div>
            )}
          </div>
          <div className="flex mt-3 flex-col items-center gap-2">
            <Checkbox
              checked={isChecked}
              onCheckedChange={handleToggle}
              disabled={toggling || deleting}
              className={`flex-shrink-0 w-7 h-7 rounded-full transition-all cursor-pointer ${
                isChecked
                  ? 'bg-green-500 border-green-500 dark:bg-green-600 dark:border-green-600'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            />
          </div>
        </div>

        {/* Subtasks toggle - only for top-level tasks */}
        {!indent && (
          <div className="mt-1 px-1">
            <button
              onClick={() => setSubtasksOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {subtasksOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {subtasksLoaded
                ? `${subtasks.length} subtask${subtasks.length !== 1 ? 's' : ''}`
                : 'Subtasks'}
            </button>
          </div>
        )}
      </div>

      {/* Subtask cards rendered outside parent card, at same level but indented */}
      {!indent && subtasksOpen && subtasks.map((sub) => (
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
