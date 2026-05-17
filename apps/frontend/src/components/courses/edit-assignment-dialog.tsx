import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import { api } from '@/lib/api';
import { X, CheckCircle, Circle } from 'lucide-react';

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

export default function EditAssignmentDialog({
  assignmentId,
  courseId,
  initialTitle,
  initialDescription,
  initialDueDate,
  initialEvalType,
  onClose,
  onEval,
}: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(initialDueDate));
  const [evalType, setEvalType] = useState(initialEvalType);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    if (!title.trim() || !selectedDate) return;
    const timer = setTimeout(async () => {
      try {
        await api.patch(`/courses/${courseId}/assignments/${assignmentId}`, {
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: selectedDate.toISOString(),
          evalType,
        });
        queryClient.invalidateQueries({ queryKey: ['courseAssignments', courseId] });
      } catch {
        // silently ignore — will retry on next change
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [title, description, selectedDate, evalType]);

  const { data: students = [] } = useQuery({
    queryKey: ['assignmentStudents', assignmentId],
    queryFn: () =>
      api
        .get<AssignmentStudent[]>(`/courses/${courseId}/assignments/${assignmentId}/students`)
        .catch(() => []),
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-8">
        <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Edit Assignment</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            className="w-full text-left border border-indigo-300 rounded-xl px-3 py-2 text-sm text-gray-900"
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

          {students.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Students
              </p>
              {students.map((s) => {
                const initials = (s.name ?? s.email)
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                return (
                  <div
                    key={s.taskId}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2"
                  >
                    {s.avatar ? (
                      <img
                        src={s.avatar}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-indigo-600">{initials}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {s.name ?? s.email}
                      </p>
                    </div>
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
                        {s.evalScore !== null ? 'Edit eval' : 'Evaluate'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Button variant="ghost" className="w-full" onClick={onClose}>
            Close
          </Button>
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
