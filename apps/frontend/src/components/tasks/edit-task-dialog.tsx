import { useState, useEffect } from 'react';
import { Calendar, CheckSquare, ChevronUp, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import { Task, TaskStatus } from '@/types';
import { api } from '@/lib/api';

type ExistingSub = { id: number; title: string };

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'TODO', label: 'To Do', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
  { value: 'IN PROGRESS', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  { value: 'DONE', label: 'Done', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
];

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
  const [status, setStatus] = useState<TaskStatus>(task.status);
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

  useEffect(() => {
    if (!isOpen) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setStatus(task.status);
    setSelectedDate(task.dueDate ? new Date(task.dueDate) : null);
    setNewSubTitles([]);
    setNewSubInput('');
    setSubtasksExpanded(false);

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

  const totalSubtasks = existingSubs.length + newSubTitles.length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="hidden">Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Task name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold border-none border-b rounded-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-gray-400"
              autoFocus
            />

            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none text-sm text-gray-700 dark:text-gray-300 bg-transparent border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 placeholder:text-gray-400"
            />

            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors border ${
                    status === opt.value
                      ? opt.color + ' border-current/30'
                      : 'bg-transparent text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="border-t dark:border-gray-700" />

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setIsDateOpen(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors text-sm font-medium ${
                  selectedDate
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-4 h-4" />
                {selectedDate ? selectedDate.toLocaleDateString() : 'Date'}
              </Button>

              {!isSubtask && (
                <Button
                  onClick={() => setSubtasksExpanded((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors text-sm font-medium ${
                    totalSubtasks > 0
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  {totalSubtasks > 0
                    ? `${totalSubtasks} Subtask${totalSubtasks > 1 ? 's' : ''}`
                    : 'Subtasks'}
                </Button>
              )}
            </div>

            {subtasksExpanded && !isSubtask && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a subtask..."
                    value={newSubInput}
                    onChange={(e) => setNewSubInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addNewSub(); }
                    }}
                    className="text-sm"
                  />
                  <Button onClick={addNewSub} size="icon" variant="outline" className="flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {existingSubs.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between px-2 py-1.5 border rounded-md bg-muted/20 text-sm">
                      <span className="truncate mr-2">{sub.title}</span>
                      <button onClick={() => setExistingSubs((prev) => prev.filter((s) => s.id !== sub.id))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {newSubTitles.map((t, i) => (
                    <div key={`new-${i}`} className="flex items-center justify-between px-2 py-1.5 border border-dashed rounded-md bg-blue-50 dark:bg-blue-950/20 text-sm">
                      <span className="truncate mr-2 text-blue-700 dark:text-blue-400">{t}</span>
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
            )}
          </div>

          <div className="flex justify-end mt-2">
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !selectedDate || saving}
              className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              <ChevronUp className="w-6 h-6" />
            </Button>
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
