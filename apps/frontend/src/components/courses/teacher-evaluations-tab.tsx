import { useState } from 'react';
import { Star, CheckCircle, Circle, ClipboardCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import EvalDialog from '@/components/courses/eval-dialog';
import { Avatar } from '@/components/ui/avatar';

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

function EvalBadge({ row, onEval, evaluateLabel }: {
  row: EvalRow;
  onEval: (row: EvalRow) => void;
  evaluateLabel: string;
}) {
  if (row.status !== 'DONE') return null;
  const hasEval = row.evalScore !== null;
  return (
    <button onClick={() => onEval(row)}>
      {hasEval ? (
        row.evalType === 'pass_fail' ? (
          row.evalScore === 1 ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">✓ Pass</span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">✗ Fail</span>
          )
        ) : (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
            {row.evalScore} b.
          </span>
        )
      ) : (
        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
          <Star className="w-3 h-3" />
          {evaluateLabel}
        </span>
      )}
    </button>
  );
}

function EvalRowItem({ row, onEval, evaluateLabel }: {
  row: EvalRow;
  onEval: (row: EvalRow) => void;
  evaluateLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm">
      <Avatar src={row.studentAvatar} name={row.studentName ?? row.studentEmail} size="sm" />
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
      <EvalBadge row={row} onEval={onEval} evaluateLabel={evaluateLabel} />
    </div>
  );
}

export default function TeacherEvaluationsTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
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

  function handleEval(row: EvalRow) {
    setEvalDialogState({
      taskId: row.taskId,
      evalType: row.evalType,
      currentScore: row.evalScore,
      currentFeedback: row.evalFeedback ?? '',
    });
  }

  const done = rows.filter((r) => r.status === 'DONE');
  const pending = rows.filter((r) => r.status !== 'DONE');
  const evaluateLabel = t('courses.evaluate');

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
        {t('courses.noGradeableAssignments')}
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
              {t('courses.toBeGraded')} ({done.filter((r) => r.evalScore === null).length})
            </span>
          </div>
          <div className="space-y-2">
            {done.map((row) => (
              <EvalRowItem key={row.taskId} row={row} onEval={handleEval} evaluateLabel={evaluateLabel} />
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Circle className="w-4 h-4 text-gray-300" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {t('courses.waitingForSubmission')} ({pending.length})
            </span>
          </div>
          <div className="space-y-2">
            {pending.map((row) => (
              <EvalRowItem key={row.taskId} row={row} onEval={handleEval} evaluateLabel={evaluateLabel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}