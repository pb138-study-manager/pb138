import { useState, useEffect } from 'react';
import { Calendar, Tag, Flag, BookOpen, ListChecks, ArrowUp, Plus, X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import { Task, TaskStatus } from '@/types';
import { api } from '@/lib/api';

interface Course { id: number; code: string; name: string | null; }

type ExistingSub = { id: number; title: string };

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
    dueDate: string;
    description?: string;
    status?: TaskStatus;
    subtasksToAdd: string[];
    subtaskIdsToDelete: number[];
  }) => Promise<void>;
}) {
  const isSubtask = task.parentId !== null;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status] = useState<TaskStatus>(task.status);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    task.dueDate ? new Date(task.dueDate) : null
  );
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);

  const [existingSubs, setExistingSubs] = useState<ExistingSub[]>([]);
  const [originalSubIds, setOriginalSubIds] = useState<number[]>([]);
  const [newSubTitles, setNewSubTitles] = useState<string[]>([]);
  const [newSubInput, setNewSubInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setSelectedDate(task.dueDate ? new Date(task.dueDate) : null);
    setNewSubTitles([]);
    setNewSubInput('');
    setSubtasksExpanded(false);
    api.get<Course[]>('/courses/enrolled').then((all) => {
      setCourses(all);
      setSelectedCourse(task.courseId ? (all.find((c) => c.id === task.courseId) ?? null) : null);
    }).catch(() => {});

    if (!isSubtask) {
      api
        .get<Task & { subtasks: Task[] }>(`/tasks/${task.id}`)
        .then((data) => {
          const subs = (data.subtasks ?? []).map((s) => ({ id: s.id, title: s.title }));
          setExistingSubs(subs);
          setOriginalSubIds(subs.map((s) => s.id));
        })
        .catch(() => {});
    }
  }, [isOpen, task, isSubtask]);

  const deletedSubIds = originalSubIds.filter((id) => !existingSubs.some((s) => s.id === id));
  const totalSubtasks = existingSubs.length + newSubTitles.length;

  function addNewSub() {
    if (!newSubInput.trim()) return;
    setNewSubTitles((prev) => [...prev, newSubInput.trim()]);
    setNewSubInput('');
  }

  async function handleSubmit() {
    if (!title.trim() || !selectedDate) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        dueDate: selectedDate.toISOString(),
        description: description.trim() || undefined,
        status,
        subtasksToAdd: newSubTitles,
        subtaskIdsToDelete: deletedSubIds,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const pills = [
    {
      icon: Calendar,
      label: selectedDate ? selectedDate.toLocaleDateString() : 'Date',
      active: selectedDate !== null,
      onClick: () => setIsDateOpen(true),
    },
    { icon: Tag, label: 'Tags', active: false, onClick: () => {} },
    { icon: Flag, label: 'Priority', active: false, onClick: () => {} },
    ...(!isSubtask
      ? [
          {
            icon: ListChecks,
            label: totalSubtasks > 0 ? `${totalSubtasks} Subtask${totalSubtasks > 1 ? 's' : ''}` : 'Subtasks',
            active: totalSubtasks > 0,
            onClick: () => setSubtasksExpanded((v) => !v),
          },
        ]
      : []),
  ];

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
              {pills.map((pill) => (
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
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                      selectedCourse
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {selectedCourse ? selectedCourse.code : 'Course'}
                  </button>
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

            {subtasksExpanded && !isSubtask && (
              <>
                <div className="border-t my-3" />
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a subtask..."
                      value={newSubInput}
                      onChange={(e) => setNewSubInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewSub(); } }}
                      className="text-sm"
                    />
                    <Button onClick={addNewSub} size="icon" variant="outline" className="flex-shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {existingSubs.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded-xl text-sm">
                        <span className="truncate mr-2 text-gray-700">{sub.title}</span>
                        <button onClick={() => setExistingSubs((prev) => prev.filter((s) => s.id !== sub.id))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {newSubTitles.map((t, i) => (
                      <div key={`new-${i}`} className="flex items-center justify-between px-2 py-1.5 bg-indigo-50 rounded-xl text-sm">
                        <span className="truncate mr-2 text-indigo-700">{t}</span>
                        <button onClick={() => setNewSubTitles((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {existingSubs.length === 0 && newSubTitles.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">No subtasks yet.</p>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || !selectedDate || saving}
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
    </>
  );
}
