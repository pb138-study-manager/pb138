import { useState, useEffect } from 'react';
import { Plus, Users, X, CheckCircle, Circle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import EvalDialog from '@/components/courses/eval-dialog';
import { PublicProfileModal } from '@/components/profile/public-profile-modal';

export interface CourseStudent {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  total: number;
  done: number;
}

export interface StudentTask {
  taskId: number;
  status: string;
  assignmentId: number;
  assignmentTitle: string;
  evalType: 'none' | 'pass_fail' | 'graded';
  dueDate: string;
  evalScore: number | null;
  evalFeedback: string | null;
}

export default function TeacherStudentsTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: courseStudents = [] } = useQuery({
    queryKey: ['courseStudents', courseId],
    queryFn: () => api.get<CourseStudent[]>(`/courses/${courseId}/students`).catch(() => []),
  });

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  const { data: studentTasks = [] } = useQuery({
    queryKey: ['studentDetail', courseId, selectedStudentId],
    queryFn: () =>
      api.get<StudentTask[]>(`/courses/${courseId}/students/${selectedStudentId}`).catch(() => []),
    enabled: selectedStudentId !== null,
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentDetail', courseId, selectedStudentId] });
      setEvalDialogState(null);
    },
  });

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<
    { id: number; name: string | null; email: string }[]
  >([]);
  const [studentError, setStudentError] = useState<string | null>(null);

  useEffect(() => {
    setStudentError(null);
    if (studentQuery.length < 2) {
      setStudentResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await api
        .get<
          { id: number; name: string | null; email: string }[]
        >(`/users/search?q=${encodeURIComponent(studentQuery)}`)
        .catch(() => []);
      setStudentResults(results);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentQuery]);

  const addStudentMutation = useMutation({
    mutationFn: (userId: number) => api.post(`/courses/${courseId}/students`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseStudents', courseId] });
      setShowAddStudent(false);
      setStudentQuery('');
      setStudentResults([]);
    },
    onError: (err: unknown) => {
      const e = err as { error?: string; message?: string };
      if (e?.error === 'ALREADY_ENROLLED')
        setStudentError(t('courses.errorAlreadyEnrolled', 'This student is already enrolled.'));
      else if (e?.error === 'SELF_ENROLLMENT_FORBIDDEN')
        setStudentError(t('courses.errorSelfEnroll', 'You cannot add yourself to a course.'));
      else setStudentError(t('courses.errorAddStudent', 'Failed to add student.'));
    },
  });

  async function handleAddStudent(userId: number) {
    setStudentError(null);
    addStudentMutation.mutate(userId);
  }

  return (
    <div className="px-4 mt-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {t('courses.students', 'Students')}
          </span>
          <span className="text-gray-400 text-sm">{courseStudents.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setShowAddStudent((v) => !v)}
        >
          <Plus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </Button>
      </div>

      {showAddStudent && (
        <div className="relative mb-3">
          <input
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder={t('courses.searchStudent', 'Search by name or email…')}
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            autoFocus
          />
          {studentError && <p className="text-xs text-red-500 mt-1 px-1">{studentError}</p>}
          {studentResults.filter((u) => !courseStudents.some((s) => s.id === u.id)).length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg mt-1 overflow-hidden">
              {studentResults
                .filter((u) => !courseStudents.some((s) => s.id === u.id))
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleAddStudent(u.id)}
                    disabled={addStudentMutation.isPending}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {u.name ?? u.email}
                    </span>
                    {u.name && <span className="text-gray-400 ml-2 text-xs">{u.email}</span>}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {courseStudents.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          {t('courses.noStudents', 'No students enrolled')}
        </p>
      ) : (
        <div className="space-y-2">
          {courseStudents.map((student) => {
            const pct =
              Number(student.total) > 0 ? Number(student.done) / Number(student.total) : 0;
            const badgeClass =
              pct >= 0.8
                ? 'bg-green-100 text-green-800'
                : pct >= 0.4
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800';
            return (
              <div
                key={student.id}
                onClick={() => setViewingUserId(student.id)}
                className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-md cursor-pointer active:scale-95 transition"
              >
                <Avatar src={student.avatar} name={student.name ?? student.email} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {student.name ?? student.email}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{student.email}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStudentId(student.id);
                  }}
                  className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${badgeClass}`}
                >
                  {Number(student.done)}/{Number(student.total)} {t('courses.done', 'done')}
                </button>
              </div>
            );
          })}
        </div>
      )}

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

      {selectedStudentId !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-8">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-5 shadow-xl space-y-3 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {courseStudents.find((s) => s.id === selectedStudentId)?.name ??
                  courseStudents.find((s) => s.id === selectedStudentId)?.email ??
                  t('courses.student', 'Student')}
              </h2>
              <button onClick={() => setSelectedStudentId(null)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            </div>
            <div className="overflow-y-auto space-y-2 flex-1">
              {studentTasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  {t('courses.noAssignments', 'No assignments yet')}
                </p>
              ) : (
                studentTasks.map((taskItem) => (
                  <div
                    key={taskItem.taskId}
                    className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2.5"
                  >
                    {taskItem.status === 'DONE' ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {taskItem.assignmentTitle}
                      </p>
                      <p className="text-xs text-gray-400">
                        {t('tasks.due', 'Due')}{' '}
                        {new Date(taskItem.dueDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    {taskItem.status === 'DONE' && taskItem.evalType !== 'none' && (
                      <button
                        onClick={() =>
                          setEvalDialogState({
                            taskId: taskItem.taskId,
                            evalType: taskItem.evalType as 'pass_fail' | 'graded',
                            currentScore: taskItem.evalScore,
                            currentFeedback: taskItem.evalFeedback ?? '',
                          })
                        }
                        className="shrink-0"
                      >
                        {taskItem.evalScore !== null ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                            {taskItem.evalScore} b.
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                            <Star className="w-3 h-3" />
                            {t('courses.evaluate')}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <PublicProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
    </div>
  );
}
