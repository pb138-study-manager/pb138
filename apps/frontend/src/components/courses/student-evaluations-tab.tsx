import { ClipboardCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

export interface CourseEval {
  assignmentTitle: string;
  dueDate: string;
  evalType: 'none' | 'pass_fail' | 'graded';
  score: number;
  feedback: string;
  evaluatedAt: string;
}

export default function StudentEvaluationsTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();

  const { data: myEvals = [], isError: evalsError } = useQuery({
    queryKey: ['myEvals', courseId],
    queryFn: () => api.get<CourseEval[]>(`/courses/${courseId}/my-evals`),
  });

  return (
    <div className="px-4 mt-6 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardCheck className="w-5 h-5 text-indigo-500" />
        <span className="font-semibold text-gray-900 dark:text-white">
          {t('courses.evaluations', 'Evaluations')}
        </span>
        <span className="text-gray-400 text-sm">{myEvals.length}</span>
      </div>
      {evalsError && (
        <p className="text-sm text-red-400 py-4 text-center">
          {t('courses.evaluationsError', 'Failed to load evaluations.')}
        </p>
      )}
      {!evalsError && myEvals.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          {t('courses.noEvaluations', 'No evaluations yet')}
        </p>
      ) : (
        <div className="space-y-2">
          {myEvals.map((e, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {e.assignmentTitle}
                </p>
                {e.evalType === 'pass_fail' ? (
                  e.score === 1 ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0">
                      ✓ {t('courses.evalPass', 'Pass')}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 shrink-0">
                      ✗ {t('courses.evalFail', 'Fail')}
                    </span>
                  )
                ) : e.evalType === 'graded' ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shrink-0">
                    {e.score}/100
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-gray-400">
                {t('tasks.due', 'Due')}{' '}
                {new Date(e.dueDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              {e.feedback && (
                <p className="text-sm text-gray-600 dark:text-gray-300 pt-1">{e.feedback}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
