import { Calendar, Tag, Flag, BookOpen, ListChecks, Plus, X, Check } from 'lucide-react';
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
import { Task, TaskStatus } from '@/types';
import { useTranslation } from 'react-i18next';
import { useEditTaskDialog, type Priority } from '@/hooks/useEditTaskDialog';

export default function EditTaskDialog({
  task,
  isOpen,
  onOpenChange,
  onSave,
}: {
  task: Task;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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
}) {
  const { t } = useTranslation();
  const isSubtask = task.parentId !== null;
  const isAssignmentTask = task.assignmentId !== null;

  const {
    title,
    setTitle,
    selectedDate,
    setSelectedDate,
    isDateOpen,
    setIsDateOpen,
    subtasksExpanded,
    setSubtasksExpanded,
    priority,
    tags,
    setTags,
    tagInputOpen,
    setTagInputOpen,
    tagInput,
    setTagInput,
    tagInputRef,
    existingSubs,
    setExistingSubs,
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
    totalSubtasks,
    PRIORITY_STYLES,
  } = useEditTaskDialog({ task, isOpen, onSave });

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
            <DialogTitle className="hidden">Edit Task</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6 space-y-0">
            <Input
              placeholder="Task name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-gray-400"
            />

            <div className="border-t" />

            <div className="flex flex-wrap gap-2 pt-4">
              <Button
                variant={selectedDate ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setIsDateOpen(true)}
                className="flex items-center gap-1.5 rounded-xl text-sm font-medium"
              >
                <Calendar className="w-3.5 h-3.5" />
                {selectedDate ? selectedDate.toLocaleDateString() : 'Date'}
              </Button>

              {isAssignmentTask && task.assignmentDeadline && (
                <span
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium bg-red-50 text-red-500 select-none"
                  title="Teacher-set deadline"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Due {new Date(task.assignmentDeadline).toLocaleDateString()}
                </span>
              )}

              <Button
                variant={tags.length > 0 ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTagInputOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl text-sm font-medium"
              >
                <Tag className="w-3.5 h-3.5" />
                {tags.length > 0 ? `${tags.length} ${t('tasks.tags')}` : t('tasks.tags')}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={cyclePriority}
                className={`flex items-center gap-1.5 rounded-xl text-sm font-medium ${priorityClass}`}
              >
                <Flag className="w-3.5 h-3.5" />
                {priorityLabel}
              </Button>

              {!isSubtask && (
                <Button
                  variant={totalSubtasks > 0 ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSubtasksExpanded((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl text-sm font-medium"
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  {totalSubtasks > 0
                    ? `${totalSubtasks} Subtask${totalSubtasks > 1 ? 's' : ''}`
                    : 'Subtasks'}
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                    selectedCourse
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {selectedCourse ? selectedCourse.code : 'Course'}
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
                        variant="ghost"
                        size="icon"
                        onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                        className="text-gray-400 hover:text-red-500"
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
          </div>
        </DialogContent>
      </Dialog>

      {!isSubtask && (
        <Dialog
          open={subtasksExpanded}
          onOpenChange={(open) => {
            if (!open) saveSubtasks();
            setSubtasksExpanded(open);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Subtasks</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a subtask..."
                  value={newSubInput}
                  onChange={(e) => setNewSubInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addNewSub();
                    }
                  }}
                  className="text-sm"
                  autoFocus
                />
                <Button onClick={addNewSub} size="icon" variant="outline" className="flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                {existingSubs.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm"
                  >
                    <span className="truncate mr-2 text-gray-700 dark:text-gray-300">
                      {sub.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExistingSubs((prev) => prev.filter((s) => s.id !== sub.id))}
                      className="text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {newSubTitles.map((subTitle, i) => (
                  <div
                    key={`new-${i}`}
                    className="flex items-center justify-between px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-sm"
                  >
                    <span className="truncate mr-2 text-indigo-700 dark:text-indigo-300">
                      {subTitle}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setNewSubTitles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {existingSubs.length === 0 && newSubTitles.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No subtasks yet.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => {
                  saveSubtasks();
                  setSubtasksExpanded(false);
                }}
              >
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <DatePickerDialog
        isOpen={isDateOpen}
        onOpenChange={setIsDateOpen}
        currentDate={selectedDate}
        onDateSelect={setSelectedDate}
      />
    </>
  );
}
