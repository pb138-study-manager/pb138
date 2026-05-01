import { useState } from 'react';
import { Calendar, Tag, Flag, BookOpen, CheckSquare, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from './date-picker-dialog';

export default function NewTaskDialog({
  isOpen,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, dueDate: string) => Promise<void>;
}) {
  const [taskName, setTaskName] = useState('');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!taskName.trim() || !selectedDate) return;
    setSaving(true);
    try {
      await onSubmit(taskName.trim(), selectedDate.toISOString());
      setTaskName('');
      setSelectedDate(null);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const taskOptions = [
    { icon: Calendar, label: 'Date' },
    { icon: Tag, label: 'Tags' },
    { icon: Flag, label: 'Priority' },
    { icon: BookOpen, label: 'Course' },
    { icon: CheckSquare, label: 'Subtasks' },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="hidden">Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              placeholder="Task name..."
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="text-lg font-semibold border-none border-b rounded-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-gray-400"
            />
            <div className="border-t" />
            <div className="flex flex-wrap gap-2">
              {taskOptions.map((option) => {
                if (option.label === 'Date') {
                  const hasDate = selectedDate !== null;

                  return (
                    <Button
                      key={option.label}
                      onClick={() => setIsDateOpen(true)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors text-sm font-medium ${
                        hasDate
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <option.icon className="w-4 h-4" />
                      {hasDate ? selectedDate.toLocaleDateString() : option.label}
                    </Button>
                  );
                }

                // Výchozí vykreslení pro ostatní tlačítka
                return (
                  <Button
                    key={option.label}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700"
                  >
                    <option.icon className="w-4 h-4" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleSubmit}
              disabled={!taskName.trim() || !selectedDate || saving}
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
