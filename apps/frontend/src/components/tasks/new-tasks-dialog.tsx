import { useState, useEffect, useRef } from 'react';
import { Calendar, Tag, Flag, BookOpen, ListChecks, ArrowUp, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import SubtasksDialog from '@/components/tasks/subtasks-dialog';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

interface Course { id: number; code: string; name: string | null; }

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | null;

const PRIORITY_CYCLE: Priority[] = [null, 'LOW', 'MEDIUM', 'HIGH'];

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
};

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
    priority?: Priority,
    tags?: string[]
  ) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [taskName, setTaskName] = useState('');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [priority, setPriority] = useState<Priority>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api.get<Course[]>('/courses/enrolled').then(setCourses).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (tagInputOpen) tagInputRef.current?.focus();
  }, [tagInputOpen]);

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

  async function handleSubmit() {
    if (!taskName.trim()) return;
    setSaving(true);
    try {
      await onSubmit(
        taskName.trim(),
        selectedDate?.toISOString() ?? undefined,
        subtasks,
        undefined,
        selectedCourse?.id,
        priority,
        tags
      );
      setTaskName('');
      setSelectedDate(new Date());
      setSubtasks([]);
      setSelectedCourse(null);
      setPriority(null);
      setTags([]);
      setTagInputOpen(false);
      setTagInput('');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
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
            <DialogTitle className="hidden">Create Task</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6 space-y-0">
            <Input
              placeholder="Task name..."
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              autoFocus
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-gray-400"
            />

            <div className="border-t" />

            <div className="flex flex-wrap gap-2 pt-4">
              {/* Date pill */}
              <button
                onClick={() => setIsDateOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  selectedDate ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {selectedDate ? selectedDate.toLocaleDateString() : 'Date'}
              </button>

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
              <button
                onClick={() => setIsSubtasksOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  subtasks.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                {subtasks.length > 0 ? `${subtasks.length} Subtask${subtasks.length > 1 ? 's' : ''}` : 'Subtasks'}
              </button>

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
