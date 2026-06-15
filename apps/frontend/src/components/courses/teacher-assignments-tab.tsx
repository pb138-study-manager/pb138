import { useState } from 'react';
import { Plus, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import NewAssignmentDialog from '@/components/courses/new-assignment-dialog';
import EditAssignmentDialog from '@/components/courses/edit-assignment-dialog';
import EvalDialog from '@/components/courses/eval-dialog';

export interface CourseAssignment {
  id: number;
  title: string;
  description: string | null;
  dueDate: string;
  evalType: 'none' | 'pass_fail' | 'graded';
  total: number;
  done: number;
}

export default function TeacherAssignmentsTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: courseAssignments = [] } = useQuery({
    queryKey: ['courseAssignments', courseId],
    queryFn: () => api.get<CourseAssignment[]>(`/courses/${courseId}/assignments`).catch(() => []),
  });

  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<CourseAssignment | null>(null);

  const addAssignmentMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      dueDate: string;
      evalType: 'none' | 'pass_fail' | 'graded';
      targetUserId?: number;
    }) => api.post(`/courses/${courseId}/assignments`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courseAssignments', courseId] }),
  });

  async function handleAddAssignment(data: {
    title: string;
    description?: string;
    dueDate: string;
    evalType: 'none' | 'pass_fail' | 'graded';
    targetUserId?: number;
  }) {
    addAssignmentMutation.mutate(data);
    setShowAddAssignment(false);
  }

  const [evalDialogState, setEvalDialogState] = useState<{
    taskId: number;
    evalType: 'pass_fail' | 'graded';
    currentScore: number | null;
    currentFeedback: string;
  } | null>(null);

  const submitEvalMutation = useMutation({
    mutationFn: ({
      taskId,
      score,
      feedback,
    }: {
      taskId: number;
      score: number;
      feedback: string;
    }) => api.post(`/tasks/${taskId}/eval`, { score, feedback }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['assignmentStudents', editingAssignment?.id] }),
  });

  async function handleSubmitEval(taskId: number, score: number, feedback: string) {
    submitEvalMutation.mutate({ taskId, score, feedback });
  }

  return (
    <div className="px-4 mt-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-indigo-500" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {t('courses.assignments', 'Assignments')}
          </span>
          <span className="text-gray-400 text-sm">{courseAssignments.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setShowAddAssignment(true)}
        >
          <Plus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </Button>
      </div>

      {courseAssignments.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          {t('courses.noAssignments', 'No assignments yet')}
        </p>
      ) : (
        <div className="space-y-2">
          {courseAssignments.map((asg) => {
            const pct = asg.total > 0 ? asg.done / asg.total : 0;
            const badgeClass =
              pct >= 0.8
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                : pct >= 0.4
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
            return (
              <div
                key={asg.id}
                onClick={() => setEditingAssignment(asg)}
                className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-md cursor-pointer active:scale-95 transition"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {asg.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t('tasks.due', 'Due')}{' '}
                    {new Date(asg.dueDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${badgeClass}`}>
                  {Number(asg.done)}/{Number(asg.total)} {t('courses.done', 'done')}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <NewAssignmentDialog
        isOpen={showAddAssignment}
        onOpenChange={setShowAddAssignment}
        onSubmit={handleAddAssignment}
      />

      {editingAssignment && (
        <EditAssignmentDialog
          assignmentId={editingAssignment.id}
          courseId={courseId}
          initialTitle={editingAssignment.title}
          initialDescription={editingAssignment.description}
          initialDueDate={editingAssignment.dueDate}
          initialEvalType={editingAssignment.evalType}
          onClose={() => setEditingAssignment(null)}
          onEval={(taskId, currentScore, currentFeedback, evalType) =>
            setEvalDialogState({
              taskId,
              evalType,
              currentScore,
              currentFeedback: currentFeedback ?? '',
            })
          }
        />
      )}

      {evalDialogState && (
        <EvalDialog
          taskId={evalDialogState.taskId}
          evalType={evalDialogState.evalType}
          currentScore={evalDialogState.currentScore}
          currentFeedback={evalDialogState.currentFeedback}
          onClose={() => setEvalDialogState(null)}
          onSubmit={handleSubmitEval}
        />
      )}
    </div>
  );
}
