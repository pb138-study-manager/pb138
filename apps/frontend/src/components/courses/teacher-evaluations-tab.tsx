import { useState } from 'react';
import { Star, CheckCircle, Circle, ClipboardCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import EvalDialog from '@/components/courses/eval-dialog';

interface EvalRow {
  taskId: number;
  userId: number;
  studentName: string | null;
  studentEmail: string;
  studentAvatar: string | null;
  assignmentId: number;
  assignmentTitle: string;
  evalType: 'pass_fail' | 'graded';
  dueDate: string;
  status: 'TODO' | 'IN PROGRESS' | 'DONE';
  evalScore: number | null;
  evalFeedback: string | null;
}

export default function TeacherEvaluationsTab({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['courseEvaluations', courseId],
    queryFn: () => api.get<EvalRow[]>(`/courses/${courseId}/evaluations`).catch(() => []),
  });

  const [evalDialogState, setEvalDialogState] = useState<{
    taskId: number;
    evalType: 'pass_fail' | 'graded';
    currentScore: number | null;
    currentFeedback: string;
  } | null>(null);

  const submitEvalMutation = useMutation({
    mutationFn: ({ taskId, score, feedback }: { taskId: number; score: number; feedback: string }) =>
      api.post(`/tasks/${taskId}/eval`, { score, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseEvaluations', courseId] });
      setEvalDialogState(null);
    },
  });

  const done = rows.filter((r) => r.status === 'DONE');
  const pending = rows.filter((r) => r.status !== 'DONE');

  function initials(name: string | null, email: string) {
    return (name ?? email)
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function EvalButton({ row }: { row: EvalRow }) {
    if (row.status !== 'DONE') return null;
    const hasEval = row.evalScore !== null;
    return (
      <button
        onClick={() =>
          setEvalDialogState({
            taskId: row.taskId,
            evalType: row.evalType,
            currentScore: row.evalScore,
            currentFeedback: row.evalFeedback ?? '',
          })
        }
      >
        {hasEval ? (
          row.evalType === 'pass_fail' ? (
            row.evalScore === 1 ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-green-100 text-green-700">✓ Pass</span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-red-100 text-red-700">✗ Fail</span>
            )
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700">
              {row.evalScore} b.
            </span>
          )
        ) : (
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors">
            <Star className="w-3 h-3" />
            Hodnotiť
          </span>
        )}
      </button>
    );
  }

  function Row({ row }: { row: EvalRow }) {
    return (
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm">
        {row.studentAvatar ? (
          <img src={row.studentAvatar} className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {initials(row.studentName, row.studentEmail)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {row.studentName ?? row.studentEmail}
          </p>
          <p className="text-xs text-gray-400 truncate">{row.assignmentTitle}</p>
        </div>
        {row.status === 'DONE' ? (
          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        ) : (
          <Circle className="w-4 h-4 text-gray-300 shrink-0" />
        )}
        <EvalButton row={row} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 mt-6 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 mt-6 text-center py-12 text-gray-400 text-sm">
        Žiadne hodnotiteľné zadania. Nastav <strong>Graded</strong> alebo <strong>Pass/Fail</strong> v nastaveniach zadania.
      </div>
    );
  }

  return (
    <div className="px-4 mt-6 mb-6 space-y-5">
      {evalDialogState && (
        <EvalDialog
          taskId={evalDialogState.taskId}
          evalType={evalDialogState.evalType}
          currentScore={evalDialogState.currentScore}
          currentFeedback={evalDialogState.currentFeedback}
          onClose={() => setEvalDialogState(null)}
          onSubmit={async (taskId, score, feedback) => {
            submitEvalMutation.mutate({ taskId, score, feedback });
          }}
        />
      )}

      {done.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">
              Na ohodnotenie ({done.filter((r) => r.evalScore === null).length})
            </span>
          </div>
          <div className="space-y-2">
            {done.map((row) => <Row key={row.taskId} row={row} />)}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Circle className="w-4 h-4 text-gray-300" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Čaká na odovzdanie ({pending.length})
            </span>
          </div>
          <div className="space-y-2">
            {pending.map((row) => <Row key={row.taskId} row={row} />)}
          </div>
        </div>
      )}
    </div>
  );
}
