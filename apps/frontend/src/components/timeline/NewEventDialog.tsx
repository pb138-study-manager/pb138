import { useState, useEffect } from 'react';
import { Calendar, AlignLeft, ArrowUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import { EventType } from '@/types';

export default function NewEventDialog({
  isOpen,
  onOpenChange,
  onSave,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    title: string;
    startDate: string;
    endDate: string;
    description?: string;
    type: EventType;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(() => new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('EVENT');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) return;
    setTitle('');
    setStartDate(new Date());
    setEndDate(null);
    setDescription('');
    setType('EVENT');
  }, [isOpen]);

  const computedEndDate = type === 'DEADLINE' ? startDate : endDate;

  async function handleSubmit() {
    if (!title.trim() || !startDate || !computedEndDate) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        startDate: startDate.toISOString(),
        endDate: computedEndDate.toISOString(),
        description: description.trim() || undefined,
        type,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader>
            <DialogTitle className="hidden">New Event</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6 space-y-0">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setType('EVENT')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${type === 'EVENT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Event
              </button>
              <button
                onClick={() => setType('DEADLINE')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${type === 'DEADLINE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Deadline
              </button>
            </div>

            <Input
              placeholder="Event name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-gray-400"
            />

            <div className="border-t" />

            <div className="flex flex-wrap gap-2 pt-4">
              <button
                onClick={() => setIsDateOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  startDate
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {startDate
                  ? startDate.toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Date'}
              </button>

              <label
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors cursor-pointer ${description ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                <AlignLeft className="w-3.5 h-3.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Note"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-medium w-28 placeholder:text-gray-400"
                />
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || !startDate || !computedEndDate || saving}
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
        currentDate={startDate}
        currentEndDate={endDate}
        onDateSelect={setStartDate}
        onEndDateSelect={setEndDate}
        showDuration={type !== 'DEADLINE'}
      />
    </>
  );
}
