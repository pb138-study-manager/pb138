import { Calendar, Tag, Flag, BookOpen, ListChecks, ArrowUp, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import SubtasksDialog from '@/components/tasks/subtasks-dialog';
import { useTranslation } from 'react-i18next';
import { PRIORITY_STYLES, useNewTaskDialog } from '@/hooks/useNewTaskDialog';

export default function NewTaskDialog({
  isOpen,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    title: string,
    dueDate: string | undefined,
    subtasks: string[],
    description?: string,
    courseId?: number,
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null,
    tags?: string[]
  ) => Promise<void>;
}) {
  const { t } = useTranslation();
  const {
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
    saving,
    priority,
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
    handleSubmit,
  } = useNewTaskDialog({ isOpen, onOpenChange, onSubmit });

  const priorityLabel = priority
    ? t(`tasks.priority${priority.charAt(0) + priority.slice(1).toLowerCase()}`)
    : t('tasks.priority');

  const priorityClass = priority
    ? PRIORITY_STYLES[priority]
    : 'bg-gray-100 text-gray-600 hover:bg-gray-200';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader>
            <DialogTitle className="hidden">Create Task</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6 space-y-0">
            <Input
              placeholder={t('tasks.namePlaceholder')}
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              autoFocus
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-gray-400"
            />

            <div className="border-t" />

            <div className="flex flex-wrap gap-2 pt-4">
              {/* Date pill */}
              <Button
                type="button"
                variant="outline"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  selectedDate
                    ? 'bg-indigo-100 text-indigo-700 border-transparent'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-border'
                }`}
                onClick={() => setIsDateOpen(true)}
              >
                <Calendar className="w-3.5 h-3.5" />
                {selectedDate ? selectedDate.toLocaleDateString(navigator.language ?? 'en-US') : t('tasks.datePill')}
              </Button>

              {/* Tags pill */}
              <Button
                type="button"
                variant="outline"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  tags.length > 0
                    ? 'bg-indigo-100 text-indigo-700 border-transparent'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-border'
                }`}
                onClick={() => setTagInputOpen((v) => !v)}
              >
                <Tag className="w-3.5 h-3.5" />
                {tags.length > 0 ? `${tags.length} ${t('tasks.tags')}` : t('tasks.tags')}
              </Button>

              {/* Priority pill */}
              <Button
                type="button"
                variant="outline"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${priorityClass}`}
                onClick={cyclePriority}
              >
                <Flag className="w-3.5 h-3.5" />
                {priorityLabel}
              </Button>

              {/* Subtasks pill */}
              <Button
                type="button"
                variant="outline"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  subtasks.length > 0
                    ? 'bg-indigo-100 text-indigo-700 border-transparent'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-border'
                }`}
                onClick={() => setIsSubtasksOpen(true)}
              >
                <ListChecks className="w-3.5 h-3.5" />
                {subtasks.length > 0
                  ? `${subtasks.length} ${t('tasks.subtasksPill')}`
                  : t('tasks.subtasksPill')}
              </Button>

              {/* Course dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                    selectedCourse
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {selectedCourse ? selectedCourse.code : t('tasks.coursePill')}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {courses.length === 0 ? (
                    <DropdownMenuItem disabled>No enrolled courses</DropdownMenuItem>
                  ) : (
                    courses.map((c) => (
                      <DropdownMenuItem
                        key={c.id}
                        onClick={() => setSelectedCourse(selectedCourse?.id === c.id ? null : c)}
                        className="flex items-center justify-between gap-4"
                      >
                        {c.code}
                        {selectedCourse?.id === c.id && (
                          <Check className="w-4 h-4 text-indigo-500" />
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tag input area */}
            {tagInputOpen && (
              <div className="pt-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
                    >
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </span>
                  ))}
                </div>
                <Input
                  ref={tagInputRef}
                  placeholder={t('tasks.addTag')}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    if (tagInput.trim()) addTag(tagInput);
                    setTagInput('');
                    setTagInputOpen(false);
                  }}
                  className="text-sm h-8"
                />
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!taskName.trim() || saving}
                className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-40 p-0"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DatePickerDialog
        isOpen={isDateOpen}
        onOpenChange={setIsDateOpen}
        currentDate={selectedDate}
        onDateSelect={setSelectedDate}
      />
      <SubtasksDialog
        isOpen={isSubtasksOpen}
        onOpenChange={setIsSubtasksOpen}
        subtasks={subtasks}
        onSubtasksChange={setSubtasks}
      />
    </>
  );
}
