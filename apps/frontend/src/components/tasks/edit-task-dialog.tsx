import { useState, useEffect, useRef } from 'react';
import { Calendar, Tag, Flag, BookOpen, ListChecks, Plus, X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import { Task, TaskStatus } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

interface Course { id: number; code: string; name: string | null; }

type ExistingSub = { id: number; title: string };
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | null;

const PRIORITY_CYCLE: Priority[] = [null, 'LOW', 'MEDIUM', 'HIGH'];

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
};

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

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status] = useState<TaskStatus>(task.status);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    task.dueDate ? new Date(task.dueDate) : null
  );
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const [priority, setPriority] = useState<Priority>((task.priority as Priority) ?? null);
  const [tags, setTags] = useState<string[]>(task.tags ?? []);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [existingSubs, setExistingSubs] = useState<ExistingSub[]>([]);
  const [originalSubIds, setOriginalSubIds] = useState<number[]>([]);
  const [newSubTitles, setNewSubTitles] = useState<string[]>([]);
  const [newSubInput, setNewSubInput] = useState('');
  const [saving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses', 'enrolled'],
    queryFn: () => api.get<Course[]>('/courses/enrolled'),
    enabled: isOpen,
  });

  const { data: fetchedTaskData } = useQuery({
    queryKey: ['tasks', task.id],
    queryFn: () => api.get<Task & { subtasks: Task[] }>(`/tasks/${task.id}`),
    enabled: isOpen && !isSubtask,
  });

  useEffect(() => {
    if (courses.length > 0 && task.courseId && isOpen) {
      setSelectedCourse(courses.find((c) => c.id === task.courseId) ?? null);
    }
  }, [courses, task.courseId, isOpen]);

  useEffect(() => {
    if (fetchedTaskData && isOpen && !isSubtask) {
      const subs = (fetchedTaskData.subtasks ?? []).map((s) => ({ id: s.id, title: s.title }));
      setExistingSubs(subs);
      setOriginalSubIds(subs.map((s) => s.id));
    }
  }, [fetchedTaskData, isOpen, isSubtask]);

  useEffect(() => {
    if (!isOpen) { initializedRef.current = false; return; }
    setTitle(task.title);
    setDescription(task.description ?? '');
    setSelectedDate(task.dueDate ? new Date(task.dueDate) : null);
    setPriority((task.priority as Priority) ?? null);
    setTags(task.tags ?? []);
    setTagInputOpen(false);
    setTagInput('');
    setNewSubTitles([]);
    setNewSubInput('');
    setSubtasksExpanded(false);
    if (!task.courseId) setSelectedCourse(null);

    setTimeout(() => { initializedRef.current = true; }, 100);
  }, [isOpen, task]);

  useEffect(() => {
    if (tagInputOpen) tagInputRef.current?.focus();
  }, [tagInputOpen]);

  const deletedSubIds = originalSubIds.filter((id) => !existingSubs.some((s) => s.id === id));
  const totalSubtasks = existingSubs.length + newSubTitles.length;

  useEffect(() => {
    if (!initializedRef.current || !title.trim() || !selectedDate) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSave({
        title: title.trim(),
        dueDate: selectedDate?.toISOString(),
        description: description.trim() || undefined,
        status,
        priority,
        tags,
        courseId: selectedCourse?.id ?? null,
        subtasksToAdd: [],
        subtaskIdsToDelete: [],
      });
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, description, selectedDate, status, priority, tags, selectedCourse, onSave]);

  function cyclePriority() {
    const idx = PRIORITY_CYCLE.indexOf(priority);
    setPriority(PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]);
  }

  function addTag(value: string) {
    const trimmed = value.trim();
    if (!trimmed || tags.length >= 20 || tags.includes(trimmed) || trimmed.length > 50) return;
    setTags((prev) => [...prev, trimmed]);
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    } else if (e.key === 'Escape') {
      setTagInputOpen(false);
      setTagInput('');
    }
  }

  function addNewSub() {
    if (!newSubInput.trim()) return;
    setNewSubTitles((prev) => [...prev, newSubInput.trim()]);
    setNewSubInput('');
  }

  async function saveSubtasks() {
    if (!title.trim() || saving) return;
    await onSave({
      title: title.trim(),
      dueDate: selectedDate?.toISOString(),
      description: description.trim() || undefined,
      status,
      priority,
      tags,
      courseId: selectedCourse?.id ?? null,
      subtasksToAdd: newSubTitles,
      subtaskIdsToDelete: deletedSubIds,
    });
    setNewSubTitles([]);
  }

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
              {/* Date pill — student's personal due date */}
              <button
                onClick={() => setIsDateOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  selectedDate ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {selectedDate ? selectedDate.toLocaleDateString() : 'Date'}
              </button>

              {/* Assignment deadline — read-only info badge */}
              {isAssignmentTask && task.assignmentDeadline && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium bg-red-50 text-red-500 select-none" title="Teacher-set deadline">
                  <Calendar className="w-3.5 h-3.5" />
                  Due {new Date(task.assignmentDeadline).toLocaleDateString()}
                </span>
              )}

              {/* Tags pill */}
              <button
                onClick={() => setTagInputOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  tags.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                {tags.length > 0 ? `${tags.length} ${t('tasks.tags')}` : t('tasks.tags')}
              </button>

              {/* Priority pill */}
              <button
                onClick={cyclePriority}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${priorityClass}`}
              >
                <Flag className="w-3.5 h-3.5" />
                {priorityLabel}
              </button>

              {/* Subtasks pill */}
              {!isSubtask && (
                <button
                  onClick={() => setSubtasksExpanded((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                    totalSubtasks > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  {totalSubtasks > 0 ? `${totalSubtasks} Subtask${totalSubtasks > 1 ? 's' : ''}` : 'Subtasks'}
                </button>
              )}

              {/* Course dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                    selectedCourse ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                        {selectedCourse?.id === c.id && <Check className="w-4 h-4 text-indigo-500" />}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {task.eval && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
                  {t('tasks.evalLabelFull')}
                </p>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-bold px-2.5 py-0.5 rounded-md">
                    {task.eval.score} b.
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(task.eval.evaluatedAt).toLocaleDateString('sk-SK')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  &ldquo;{task.eval.feedback}&rdquo;
                </p>
              </div>
            )}

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
                      <button onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                        <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                      </button>
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

      {/* Subtasks Dialog */}
      {!isSubtask && (
        <Dialog open={subtasksExpanded} onOpenChange={(open) => {
          if (!open) saveSubtasks();
          setSubtasksExpanded(open);
        }}>
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
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewSub(); } }}
                  className="text-sm"
                  autoFocus
                />
                <Button onClick={addNewSub} size="icon" variant="outline" className="flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                {existingSubs.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                    <span className="truncate mr-2 text-gray-700 dark:text-gray-300">{sub.title}</span>
                    <button onClick={() => setExistingSubs((prev) => prev.filter((s) => s.id !== sub.id))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {newSubTitles.map((subTitle, i) => (
                  <div key={`new-${i}`} className="flex items-center justify-between px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-sm">
                    <span className="truncate mr-2 text-indigo-700 dark:text-indigo-300">{subTitle}</span>
                    <button onClick={() => setNewSubTitles((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {existingSubs.length === 0 && newSubTitles.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No subtasks yet.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => { saveSubtasks(); setSubtasksExpanded(false); }}>Save</Button>
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
