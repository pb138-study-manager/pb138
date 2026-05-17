import { useState } from 'react';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    dueDate: string;
    evalType: 'none' | 'pass_fail' | 'graded';
  }) => Promise<void>;
}

export default function NewAssignmentDialog({ isOpen, onOpenChange, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [evalType, setEvalType] = useState<'none' | 'pass_fail' | 'graded'>('none');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !selectedDate) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: selectedDate.toISOString(),
        evalType,
      });
      setTitle('');
      setDescription('');
      setSelectedDate(null);
      setEvalType('none');
      onOpenChange(false);
    } catch {
      // dialog stays open on error
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-8">
        <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-gray-900">New Assignment</h2>

          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
            placeholder="Description (optional)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button
            onClick={() => setIsDateOpen(true)}
            className={`w-full text-left border rounded-xl px-3 py-2 text-sm ${
              selectedDate ? 'border-indigo-300 text-gray-900' : 'border-gray-200 text-gray-400'
            }`}
          >
            {selectedDate ? selectedDate.toLocaleDateString() : 'Due date'}
          </button>

          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">Evaluation type</p>
            <div className="flex gap-2">
              {(['none', 'pass_fail', 'graded'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setEvalType(type)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    evalType === type
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {type === 'none' ? 'None' : type === 'pass_fail' ? 'Pass/Fail' : 'Graded'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={saving || !title.trim() || !selectedDate}
            >
              {saving ? 'Saving…' : 'Create'}
            </Button>
          </div>
        </div>
      </div>

      <DatePickerDialog
        isOpen={isDateOpen}
        onOpenChange={setIsDateOpen}
        currentDate={selectedDate}
        onDateSelect={setSelectedDate}
      />
    </>
  );
}
