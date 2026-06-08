import { useState, useEffect } from 'react';
import { Calendar, Tag, Flag, BookOpen, ListChecks, ArrowUp, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import SubtasksDialog from '@/components/tasks/subtasks-dialog';
import { api } from '@/lib/api';

interface Course { id: number; code: string; name: string | null; }

export default function NewTaskDialog({
  isOpen,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, dueDate: string | undefined, subtasks: string[], description?: string, courseId?: number) => Promise<void>;
}) {
  const [taskName, setTaskName] = useState('');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api.get<Course[]>('/courses/enrolled').then(setCourses).catch(() => {});
  }, [isOpen]);

  async function handleSubmit() {
    if (!taskName.trim()) return;
    setSaving(true);
    try {
      await onSubmit(taskName.trim(), selectedDate?.toISOString() ?? undefined, subtasks, undefined, selectedCourse?.id);
      setTaskName('');
      setSelectedDate(new Date());
      setSubtasks([]);
      setSelectedCourse(null);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const simplePills = [
    {
      icon: Calendar,
      label: selectedDate ? selectedDate.toLocaleDateString() : 'Date',
      active: selectedDate !== null,
      onClick: () => setIsDateOpen(true),
    },
    { icon: Tag, label: 'Tags', active: false, onClick: () => {} },
    { icon: Flag, label: 'Priority', active: false, onClick: () => {} },
    {
      icon: ListChecks,
      label: subtasks.length > 0 ? `${subtasks.length} Subtask${subtasks.length > 1 ? 's' : ''}` : 'Subtasks',
      active: subtasks.length > 0,
      onClick: () => setIsSubtasksOpen(true),
    },
  ];

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
              {simplePills.map((pill) => (
                <button
                  key={pill.label}
                  onClick={pill.onClick}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                    pill.active
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <pill.icon className="w-3.5 h-3.5" />
                  {pill.label}
                </button>
              ))}

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
                        {selectedCourse?.id === c.id && <Check className="w-4 h-4 text-indigo-500" />}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

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
