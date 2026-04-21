import { useState } from 'react';
import { Calendar, Tag, Flag, BookOpen, CheckSquare, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from './date-picker-dialog';

export default function NewTaskDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [taskName, setTaskName] = useState('');

  const taskOptions = [
    { icon: Calendar, label: 'Date' },
    { icon: Tag, label: 'Tags' },
    { icon: Flag, label: 'Priority' },
    { icon: BookOpen, label: 'Course' },
    { icon: CheckSquare, label: 'Subtasks' },
  ];
  const [isDateOpen, setIsDateOpen] = useState(false);

  return (
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
                return (
                  <Button
                    key={option.label}
                    onClick={() => setIsDateOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700"
                  >
                    <option.icon className="w-4 h-4" />
                    {option.label}
                  </Button>
                );
              }

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
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
          >
            <ChevronUp className="w-6 h-6" />
          </Button>
        </div>
      </DialogContent>
      <DatePickerDialog isOpen={isDateOpen} onOpenChange={setIsDateOpen} />
    </Dialog>
  );
}
