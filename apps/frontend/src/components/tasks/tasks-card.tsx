import { useState } from 'react';
import { Clock, Users, MoreVertical, Trash2 } from 'lucide-react';
import { Task } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function TaskCard({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [isChecked, setIsChecked] = useState(task.status === 'DONE');
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { t } = useTranslation();

  const dueTime = task.dueDate
    ? `${t('tasks.due')} ${new Date(task.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : t('tasks.noDueDate');
  const subject = task.description || t('tasks.noDescription');
  const progress = task.status === 'DONE' ? 4 : task.status === 'IN PROGRESS' ? 2 : 1;
  const maxProgress = 4;
  const hasUsers = task.assignmentId !== null;
  const progressPercent = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

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
      setPopoverOpen(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 flex items-start gap-3 hover:shadow-sm dark:hover:shadow-gray-900 transition-shadow">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
          {task.title}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          {hasUsers && <Users className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
          <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {dueTime} · {subject}
          </p>
        </div>
        {maxProgress > 0 && (
          <div className="mt-1.5">
            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 dark:bg-blue-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-blue-500 dark:text-blue-400 font-medium mt-0.5 block">
              {progress}/{maxProgress}
            </span>
          </div>
        )}
      </div>
      <div className="flex mt-3 flex-col items-center gap-2">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'h-6 w-6 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus-visible:ring-0'
            )}
          >
            <MoreVertical className="w-4 h-4" />
          </PopoverTrigger>
          <PopoverContent className="w-32 p-1 dark:bg-gray-800 dark:border-gray-700" align="end">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('tasks.delete')}
            </Button>
          </PopoverContent>
        </Popover>

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
  );
}
