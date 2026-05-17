import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, ClipboardCheck, Users, Check, CheckCircle, Circle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import { api } from '@/lib/api';

interface AssignmentStudent {
  taskId: number;
  userId: number;
  name: string | null;
  email: string;
  avatar: string | null;
  status: 'TODO' | 'IN PROGRESS' | 'DONE';
  evalScore: number | null;
}

interface Props {
  assignmentId: number;
  courseId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialDueDate: string;
  initialEvalType: 'none' | 'pass_fail' | 'graded';
  onClose: () => void;
  onEval: (taskId: number, evalScore: number | null, evalType: 'pass_fail' | 'graded') => void;
}

const EVAL_LABELS: Record<string, string> = {
  none: 'No eval',
  pass_fail: 'Pass/Fail',
  graded: 'Graded',
};

export default function EditAssignmentDialog({
  assignmentId,
  courseId,
  initialTitle,
  initialDueDate,
  initialEvalType,
  onClose,
  onEval,
}: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initialTitle);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(initialDueDate));
  const [evalType, setEvalType] = useState(initialEvalType);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [studentsExpanded, setStudentsExpanded] = useState(false);
  const initializedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => { initializedRef.current = true; }, 100);
  }, []);

  useEffect(() => {
    if (!initializedRef.current || !title.trim() || !selectedDate) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await api.patch(`/courses/${courseId}/assignments/${assignmentId}`, {
          title: title.trim(),
          dueDate: selectedDate.toISOString(),
          evalType,
        });
        queryClient.invalidateQueries({ queryKey: ['courseAssignments', courseId] });
      } catch { /* silently ignore */ }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, selectedDate, evalType]);

  const { data: students = [] } = useQuery({
    queryKey: ['assignmentStudents', assignmentId],
    queryFn: () =>
      api
        .get<AssignmentStudent[]>(`/courses/${courseId}/assignments/${assignmentId}/students`)
        .catch(() => []),
    enabled: studentsExpanded,
  });

  const totalStudents = students.length;
  const doneCount = students.filter((s) => s.status === 'DONE').length;

  const pills = [
    {
      icon: Calendar,
      label: selectedDate ? selectedDate.toLocaleDateString() : 'Date',
      active: selectedDate !== null,
      onClick: () => setIsDateOpen(true),
    },
  ];

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader>
            <DialogTitle className="hidden">Edit Assignment</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6 space-y-0">
            <Input
              placeholder="Assignment name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-gray-400"
            />

            <div className="border-t" />

            <div className="flex flex-wrap gap-2 pt-4">
              {/* Date pill */}
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

              {/* Eval type dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                      evalType !== 'none'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    {EVAL_LABELS[evalType]}
                  </button>
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

              {/* Students pill — toggles expanded section */}
              <button
                onClick={() => setStudentsExpanded((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  studentsExpanded
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                {totalStudents > 0 ? `${doneCount}/${totalStudents} done` : 'Students'}
              </button>
            </div>

            {/* Students expanded section — like subtasks in edit-task-dialog */}
            {studentsExpanded && (
              <>
                <div className="border-t my-3" />
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {students.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">No students assigned.</p>
                  ) : (
                    students.map((s) => {
                      const initials = (s.name ?? s.email)
                        .split(' ')
                        .map((w: string) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();
                      return (
                        <div
                          key={s.taskId}
                          className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-xl text-sm"
                        >
                          {s.avatar ? (
                            <img src={s.avatar} className="w-6 h-6 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-indigo-600">{initials}</span>
                            </div>
                          )}
                          <span className="flex-1 truncate text-gray-700">
                            {s.name ?? s.email}
                          </span>
                          {s.status === 'DONE' ? (
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                          )}
                          {s.status === 'DONE' && evalType !== 'none' && (
                            <button
                              onClick={() => onEval(s.taskId, s.evalScore, evalType as 'pass_fail' | 'graded')}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 shrink-0"
                            >
                              {s.evalScore !== null ? 'Edit' : 'Eval'}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
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
