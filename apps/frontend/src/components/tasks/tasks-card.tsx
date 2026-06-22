import { Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EditTaskDialog from '@/components/tasks/edit-task-dialog';
import { useTaskCard } from '@/hooks/useTaskCard';
import { Task, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { getUrgency, getCountdown } from '@/lib/task-utils';
import { UrgencyPill } from '@/components/shared/urgency-pill';
import { PriorityPill } from '@/components/shared/priority-pill';

interface TaskCardProps {
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

export default function TaskCard({
  task,
  onToggle,
  onEditFull,
  onDelete,
  indent = false,
}: TaskCardProps) {
  const {
    isChecked,
    toggling,
    subtasksOpen,
    toggleSubtasks,
    subtasks,
    editOpen,
    setEditOpen,
    handleToggle,
    handleSubToggle,
    handleSubDelete,
    handleSubEditFull,
    handleSave,
    effectiveDueDate,
    hasUsers,
    displayTags,
    visibleTags,
    extraTagCount,
    effectiveDone,
    effectiveTotal,
    progressPercent,
    subtaskButtonLabel,
  } = useTaskCard({ task, onToggle, onEditFull, onDelete, indent });

  const { t } = useTranslation();
  const dueTime = effectiveDueDate
    ? `${task.dueDate ? t('tasks.due') : 'Deadline'} ${new Date(effectiveDueDate).toLocaleString(
        navigator.language ?? 'en-US',
        {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      )}`
    : t('tasks.noDueDate');

  const urgency = getUrgency(effectiveDueDate);
  const countdown = getCountdown(effectiveDueDate, t('tasks.noDate'));

  const PRIORITY_LABELS: Record<string, string> = {
    LOW: t('tasks.priorityLow'),
    MEDIUM: t('tasks.priorityMedium'),
    HIGH: t('tasks.priorityHigh'),
  };

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
                isChecked
                  ? 'line-through text-gray-400 opacity-50'
                  : 'text-gray-900 dark:text-white'
              )}
            >
              {task.title}
            </p>
            <p className="text-[13px] text-gray-400 mt-0.5 truncate">{dueTime}</p>

            {task.status !== 'DONE' && (countdown || task.priority || displayTags.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {countdown &&
                  (urgency ? (
                    <UrgencyPill urgency={urgency} label={countdown} />
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      {countdown}
                    </span>
                  ))}
                {task.priority && (
                  <PriorityPill priority={task.priority} label={PRIORITY_LABELS[task.priority]} />
                )}
                {visibleTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md font-medium"
                  >
                    {tag}
                  </span>
                ))}
                {extraTagCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md font-medium">
                    +{extraTagCount} more
                  </span>
                )}
              </div>
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

          {task.eval && isChecked && (
            <span className="shrink-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded-md border border-green-200 dark:border-green-800">
              {task.eval.score} b.
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            disabled={toggling}
            className="shrink-0 ml-1"
          >
            {isChecked ? (
              <div className="w-7 h-7 rounded-full border-2 border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-500" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full border-2 border-gray-300 dark:border-gray-600" />
            )}
          </Button>
        </div>

        {task.eval && isChecked && (
          <div className="px-4 pb-3">
            <div className="border-l-2 border-green-400 dark:border-green-600 pl-2 bg-green-50 dark:bg-green-900/20 rounded-r-md py-1.5 px-2">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-0.5">
                {t('tasks.evalLabel')}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                &ldquo;{task.eval.feedback}&rdquo;
              </p>
            </div>
          </div>
        )}

        {!indent && effectiveTotal > 0 && (
          <div className="px-5 pb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              onClick={toggleSubtasks}
            >
              {subtasksOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {subtaskButtonLabel}
            </Button>
          </div>
        )}
      </div>

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
