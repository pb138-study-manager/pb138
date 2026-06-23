import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, AlignLeft, ArrowUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import { EventType } from '@/types';

const schema = z.object({
  title: z.string().min(1, { message: 'Event name is required' }),
  startDate: z.string().min(1, { message: 'Start date is required' }),
  description: z.string(),
});

type EventForm = z.infer<typeof schema>;

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
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [type, setType] = useState<EventType>('EVENT');
  const [isDateOpen, setIsDateOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isValid, isSubmitting },
  } = useForm<EventForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      startDate: new Date().toISOString(),
      description: '',
    },
  });

  const startDateValue = watch('startDate');
  const startDate = startDateValue ? new Date(startDateValue) : null;
  const computedEndDate = type === 'DEADLINE' ? startDate : endDate;

  useEffect(() => {
    if (isOpen) return;
    reset({ title: '', startDate: new Date().toISOString(), description: '' });
    setEndDate(null);
    setType('EVENT');
  }, [isOpen, reset]);

  async function onFormSubmit(data: EventForm) {
    if (!computedEndDate) return;
    await onSave({
      title: data.title.trim(),
      startDate: data.startDate,
      endDate: computedEndDate.toISOString(),
      description: data.description.trim() || undefined,
      type,
    });
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader>
            <DialogTitle className="hidden">New Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onFormSubmit)}>
            <div className="px-6 py-6 space-y-0">
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setType('EVENT')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${type === 'EVENT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Event
                </button>
                <button
                  type="button"
                  onClick={() => setType('DEADLINE')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${type === 'DEADLINE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Deadline
                </button>
              </div>

              <Input
                placeholder="Event name..."
                autoFocus
                {...register('title')}
                className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-gray-400"
              />

              <div className="border-t" />

              <div className="flex flex-wrap gap-2 pt-4">
                <button
                  type="button"
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
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors cursor-pointer ${watch('description') ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  <AlignLeft className="w-3.5 h-3.5 shrink-0" />
                  <input
                    type="text"
                    placeholder="Note"
                    {...register('description')}
                    className="bg-transparent border-none outline-none text-sm font-medium w-28 placeholder:text-gray-400"
                  />
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={!isValid || isSubmitting || (!computedEndDate && type !== 'DEADLINE')}
                  className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-40 p-0"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DatePickerDialog
        isOpen={isDateOpen}
        onOpenChange={setIsDateOpen}
        currentDate={startDate}
        currentEndDate={endDate}
        onDateSelect={(date) => setValue('startDate', date ? date.toISOString() : '', { shouldValidate: true })}
        onEndDateSelect={setEndDate}
        showDuration={type !== 'DEADLINE'}
      />
    </>
  );
}
