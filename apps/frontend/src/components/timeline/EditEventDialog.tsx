import { useState, useEffect, useRef } from 'react';
import { Calendar, AlignLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import { Event, EventType } from '@/types';

export default function EditEventDialog({
  event,
  isOpen,
  onOpenChange,
  onSave,
}: {
  event: Event;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    title: string;
    startDate: string;
    endDate: string;
    description?: string | null;
    place?: string;
    type: EventType;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(event.title);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [type, setType] = useState<EventType>('EVENT');
  const [description, setDescription] = useState(event.description ?? '');
  const place = event.place ?? '';
  const [isDateOpen, setIsDateOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      return;
    }
    setTitle(event.title);
    setStartDate(new Date(event.startDate));
    setEndDate(new Date(event.endDate));
    setType(event.type ?? 'EVENT');
    setDescription(event.description ?? '');
    setTimeout(() => {
      initializedRef.current = true;
    }, 100);
  }, [isOpen, event]);

  const computedEndDate = type === 'DEADLINE' ? startDate : endDate;

  useEffect(() => {
    if (!initializedRef.current || !title.trim() || !startDate || !computedEndDate) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSave({
        title: title.trim(),
        startDate: startDate.toISOString(),
        endDate: computedEndDate.toISOString(),
        description: description.trim() === '' ? null : description.trim(),
        place: place.trim() || undefined,
        type,
      });
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title, startDate, endDate, type, description, computedEndDate, onSave, place]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader>
            <DialogTitle className="hidden">Edit Event</DialogTitle>
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
