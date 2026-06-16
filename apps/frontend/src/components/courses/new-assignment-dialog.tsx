import { useState, useEffect } from 'react';
import { Calendar, ClipboardCheck, Users, ArrowUp, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Student {
  id: number;
  name: string | null;
  email: string;
}

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    dueDate: string;
    evalType: 'none' | 'pass_fail' | 'graded';
    targetUserId?: number;
  }) => Promise<void>;
}

const EVAL_LABELS: Record<string, string> = {
  none: 'No eval',
  pass_fail: 'Pass/Fail',
  graded: 'Graded',
};

export default function NewAssignmentDialog({ isOpen, onOpenChange, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [evalType, setEvalType] = useState<'none' | 'pass_fail' | 'graded'>('none');
  const [sendTo, setSendTo] = useState<'class' | 'student'>('class');
  const [studentQuery, setStudentQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setSelectedDate(null);
      setEvalType('none');
      setSendTo('class');
      setStudentQuery('');
      setDebouncedQuery('');
      setSelectedStudent(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(studentQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentQuery]);

  const { data: fetchedResults = [] } = useQuery({
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: () => api.get<Student[]>(`/users/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 2,
  });

  const studentResults = debouncedQuery.length >= 2 ? fetchedResults : [];

  async function handleSubmit() {
    if (!title.trim() || !selectedDate) return;
    if (sendTo === 'student' && !selectedStudent) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        dueDate: selectedDate.toISOString(),
        evalType,
        targetUserId: sendTo === 'student' ? selectedStudent!.id : undefined,
      });
      onOpenChange(false);
    } catch {
      // dialog stays open on error
    } finally {
      setSaving(false);
    }
  }

  const pills = [
    {
      icon: Calendar,
      label: selectedDate ? selectedDate.toLocaleDateString() : 'Due date',
      active: selectedDate !== null,
      onClick: () => setIsDateOpen(true),
    },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader>
            <DialogTitle className="hidden">New Assignment</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6 space-y-0">
            <Input
              placeholder="Assignment name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-gray-400"
            />

            <div className="border-t border-gray-100 dark:border-gray-800" />

            <div className="flex flex-wrap gap-2 pt-4">
              {/* Date pill */}
              {pills.map((pill) => (
                <button
                  key={pill.label}
                  onClick={pill.onClick}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                    pill.active
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <pill.icon className="w-3.5 h-3.5" />
                  {pill.label}
                </button>
              ))}

              {/* Eval type dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                    evalType !== 'none'
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  {EVAL_LABELS[evalType]}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {(['none', 'pass_fail', 'graded'] as const).map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => setEvalType(type)}
                      className="flex items-center justify-between gap-4"
                    >
                      {EVAL_LABELS[type]}
                      {evalType === type && <Check className="w-4 h-4 text-indigo-500" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Send to dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                    sendTo === 'student'
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  {sendTo === 'student' && selectedStudent
                    ? (selectedStudent.name ?? selectedStudent.email)
                    : sendTo === 'student'
                      ? 'Select student…'
                      : 'Whole class'}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => {
                      setSendTo('class');
                      setSelectedStudent(null);
                      setStudentQuery('');
                    }}
                    className="flex items-center justify-between gap-4"
                  >
                    Whole class
                    {sendTo === 'class' && <Check className="w-4 h-4 text-indigo-500" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSendTo('student')}
                    className="flex items-center justify-between gap-4"
                  >
                    Specific student
                    {sendTo === 'student' && <Check className="w-4 h-4 text-indigo-500" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Student search — shown when sendTo === 'student' */}
            {sendTo === 'student' && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 my-3" />
                <div className="relative">
                  {selectedStudent ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-sm">
                      <span className="flex-1 text-indigo-700 dark:text-indigo-300 font-medium truncate">
                        {selectedStudent.name ?? selectedStudent.email}
                        {selectedStudent.name && (
                          <span className="text-indigo-400 dark:text-indigo-500 ml-1 text-xs">
                            {selectedStudent.email}
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedStudent(null);
                          setStudentQuery('');
                        }}
                        className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Input
                        placeholder="Search student by name or email…"
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                        className="text-sm"
                        autoFocus
                      />
                      {studentResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg mt-1 overflow-hidden">
                          {studentResults.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setSelectedStudent(u);
                                setStudentQuery('');
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                            >
                              <span className="font-medium text-gray-900 dark:text-white">
                                {u.name ?? u.email}
                              </span>
                              {u.name && (
                                <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">
                                  {u.email}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSubmit}
                disabled={
                  !title.trim() ||
                  !selectedDate ||
                  saving ||
                  (sendTo === 'student' && !selectedStudent)
                }
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
