import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { ChevronLeft, Plus, CheckSquare, BookOpen, Users, ClipboardCheck, Trash2 } from 'lucide-react';
import { useRoleMode } from '@/lib/roleMode';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Task, TaskStatus } from '@/types';
import TaskCard from '@/components/tasks/tasks-card';
import NewAssignmentDialog from '@/components/courses/new-assignment-dialog';
import EditAssignmentDialog from '@/components/courses/edit-assignment-dialog';
import EvalDialog from '@/components/courses/eval-dialog';

export const Route = createFileRoute('/courses/$courseId')({
  component: CourseDetailPage,
});

interface Course {
  id: number;
  code: string;
  name: string | null;
  semester: string;
  lectureSchedule: string | null;
  seminarSchedule: string | null;
  lectureTeacherId: number | null;
  teacherName: string | null;
  teacherAvatar: string | null;
  enrolled: boolean;
}

interface CourseNote {
  id: number;
  title: string;
  courseId: number | null;
  folderId: number | null;
}

interface StudyMaterial {
  id: number;
  title: string;
  url: string | null;
  description: string | null;
}

interface CourseAssignment {
  id: number;
  title: string;
  description: string | null;
  dueDate: string;
  evalType: 'none' | 'pass_fail' | 'graded';
  total: number;
  done: number;
}

interface CourseStudent {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  total: number;
  done: number;
}

function CourseDetailPage() {
  const { courseId } = useParams({ from: '/courses/$courseId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'materials'>('tasks');
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: course, isPending: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => api.get<Course>(`/courses/${courseId}`),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').catch(() => []),
  });

  const { data: allNotes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: () => api.get<CourseNote[]>('/notes').catch(() => []),
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['courseMaterials', courseId],
    queryFn: () => api.get<StudyMaterial[]>(`/courses/${courseId}/materials`).catch(() => []),
  });

  const { mode } = useRoleMode();
  const isTeacher = mode === 'teacher';

  const [teacherTab, setTeacherTab] = useState<'assignments' | 'materials' | 'students'>(
    'assignments'
  );

  const { data: courseAssignments = [] } = useQuery({
    queryKey: ['courseAssignments', courseId],
    queryFn: () =>
      api.get<CourseAssignment[]>(`/courses/${courseId}/assignments`).catch(() => []),
    enabled: isTeacher,
  });

  const { data: courseStudents = [] } = useQuery({
    queryKey: ['courseStudents', courseId],
    queryFn: () => api.get<CourseStudent[]>(`/courses/${courseId}/students`).catch(() => []),
    enabled: isTeacher,
  });

  // Materials state
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matUrl, setMatUrl] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [savingMat, setSavingMat] = useState(false);

  async function handleAddMaterial() {
    if (!matTitle.trim()) return;
    setSavingMat(true);
    try {
      await api.post(`/courses/${courseId}/materials`, {
        title: matTitle.trim(),
        url: matUrl.trim() || undefined,
        description: matDesc.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] });
      setMatTitle('');
      setMatUrl('');
      setMatDesc('');
      setShowAddMaterial(false);
    } catch {
      // silently ignore — dialog stays open so teacher can retry
    } finally {
      setSavingMat(false);
    }
  }

  async function handleDeleteMaterial(materialId: number) {
    try {
      await api.delete(`/courses/${courseId}/materials/${materialId}`);
      queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] });
    } catch {
      // silently ignore
    }
  }

  // Assignment state
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<CourseAssignment | null>(null);

  async function handleAddAssignment(data: {
    title: string;
    description?: string;
    dueDate: string;
    evalType: 'none' | 'pass_fail' | 'graded';
    targetUserId?: number;
  }) {
    await api.post(`/courses/${courseId}/assignments`, data);
    queryClient.invalidateQueries({ queryKey: ['courseAssignments', courseId] });
  }

  // Eval dialog state
  const [evalDialogState, setEvalDialogState] = useState<{
    taskId: number;
    evalType: 'pass_fail' | 'graded';
    currentScore: number | null;
  } | null>(null);

  async function handleSubmitEval(taskId: number, score: number, feedback: string) {
    await api.post(`/tasks/${taskId}/eval`, { score, feedback });
    queryClient.invalidateQueries({
      queryKey: ['assignmentStudents', editingAssignment?.id],
    });
  }

  // Student search state
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<
    { id: number; name: string | null; email: string }[]
  >([]);
  const [addingStudent, setAddingStudent] = useState(false);

  useEffect(() => {
    if (studentQuery.length < 2) {
      setStudentResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await api
        .get<{ id: number; name: string | null; email: string }[]>(
          `/users/search?q=${encodeURIComponent(studentQuery)}`
        )
        .catch(() => []);
      setStudentResults(results);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentQuery]);

  async function handleAddStudent(userId: number) {
    setAddingStudent(true);
    try {
      await api.post(`/courses/${courseId}/students`, { userId });
      queryClient.invalidateQueries({ queryKey: ['courseStudents', courseId] });
      setShowAddStudent(false);
      setStudentQuery('');
      setStudentResults([]);
    } catch {
      // silently ignore
    } finally {
      setAddingStudent(false);
    }
  }

  const tasks = allTasks.filter((t) => t.courseId === Number(courseId));
  const notes = allNotes.filter((n) => n.courseId === Number(courseId));

  async function handleToggle(id: number) {
    const updated = await api.patch<Task>(`/tasks/${id}/toggle-done`, {});
    queryClient.setQueryData<Task[]>(['tasks'], (prev = []) =>
      prev.map((t) => (t.id === id ? updated : t))
    );
  }

  async function handleEditFull(
    id: number,
    data: { title: string; dueDate: string; description?: string; status?: TaskStatus },
    subtasksToAdd: string[],
    subtaskIdsToDelete: number[]
  ) {
    await Promise.all([
      api.patch<Task>(`/tasks/${id}`, data),
      ...subtaskIdsToDelete.map((subId) => api.delete(`/tasks/${subId}`)),
    ]);
    await Promise.all(
      subtasksToAdd.map((title) =>
        api.post<Task>('/tasks', { title, dueDate: data.dueDate, parentId: id })
      )
    );
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }

  async function handleDelete(id: number) {
    await api.delete(`/tasks/${id}`);
    queryClient.setQueryData<Task[]>(['tasks'], (prev = []) => prev.filter((t) => t.id !== id));
  }

  async function createTask() {
    if (!newTaskTitle.trim() || !newTaskDate) return;
    setSaving(true);
    try {
      await api.post<Task>('/tasks', {
        title: newTaskTitle.trim(),
        dueDate: newTaskDate,
        courseId: Number(courseId),
      });
      setNewTaskTitle('');
      setNewTaskDate('');
      setShowNewTask(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } finally {
      setSaving(false);
    }
  }

  if (courseLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400">Course not found</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white pb-20">
      {/* Header */}
      <div className="px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/courses' })}
            className="size-8"
          >
            <ChevronLeft className="size-6" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{course.code}</h1>
            <p className="text-sm text-gray-500">{course.name ?? course.code}</p>
          </div>
        </div>

        {/* Teacher info — only shown in student mode */}
        {!isTeacher && (
          <div className="flex items-center gap-3 mb-4">
            {course.teacherAvatar ? (
              <img src={course.teacherAvatar} className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
            )}
            <span className="text-sm font-medium text-gray-700">
              {course.teacherName ?? 'Unknown teacher'}
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      {isTeacher ? (
        <div className="flex border-b border-gray-200 px-4">
          {(['assignments', 'materials', 'students'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTeacherTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                teacherTab === tab
                  ? 'border-gray-800 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex border-b border-gray-200 px-4">
          {(['tasks', 'notes', 'materials'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-gray-800 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Tasks */}
      {!isTeacher && activeTab === 'tasks' && (
        <div className="px-4 mt-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-gray-900">Tasks</span>
              <span className="text-gray-400 text-sm">{tasks.length}</span>
            </div>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowNewTask(true)}>
              <Plus className="w-5 h-5 text-gray-700" />
            </Button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No tasks for this course</p>
          ) : (
            <div className="space-y-6">
              {tasks.filter((t) => t.assignmentId !== null).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Assigned</p>
                  {tasks.filter((t) => t.assignmentId !== null).map((task) => (
                    <TaskCard key={task.id} task={task} onToggle={handleToggle} onEditFull={handleEditFull} onDelete={handleDelete} />
                  ))}
                </div>
              )}
              {tasks.filter((t) => t.assignmentId === null).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Created by me</p>
                  {tasks.filter((t) => t.assignmentId === null).map((task) => (
                    <TaskCard key={task.id} task={task} onToggle={handleToggle} onEditFull={handleEditFull} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          )}

          {showNewTask && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-8">
              <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4">
                <h2 className="text-base font-semibold text-gray-900">New task</h2>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="Task title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  autoFocus
                />
                <input
                  type="datetime-local"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowNewTask(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={createTask}
                    disabled={saving || !newTaskTitle.trim() || !newTaskDate}
                  >
                    {saving ? 'Saving…' : 'Add task'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {!isTeacher && activeTab === 'notes' && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-gray-900">Notes</span>
              <span className="text-gray-400 text-sm">{notes.length}</span>
            </div>
          </div>
          {notes.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No notes for this course</p>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm"
                >
                  <p className="text-sm font-medium text-gray-900">{note.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Materials (student view) */}
      {!isTeacher && activeTab === 'materials' && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-gray-900">Study Materials</span>
              <span className="text-gray-400 text-sm">{materials.length}</span>
            </div>
          </div>
          {materials.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No materials for this course</p>
          ) : (
            <div className="space-y-2">
              {materials.map((material) => (
                <div
                  key={material.id}
                  onClick={() => material.url && window.open(material.url, '_blank')}
                  className={`flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm ${material.url ? 'cursor-pointer active:scale-95 transition' : ''}`}
                >
                  <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{material.title}</p>
                    {material.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{material.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Teacher: Assignments tab */}
      {isTeacher && teacherTab === 'assignments' && (
        <div className="px-4 mt-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-gray-900">Assignments</span>
              <span className="text-gray-400 text-sm">{courseAssignments.length}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setShowAddAssignment(true)}
            >
              <Plus className="w-5 h-5 text-gray-700" />
            </Button>
          </div>

          {courseAssignments.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No assignments yet</p>
          ) : (
            <div className="space-y-2">
              {courseAssignments.map((asg) => {
                const pct = asg.total > 0 ? asg.done / asg.total : 0;
                const badgeClass =
                  pct >= 0.8
                    ? 'bg-green-100 text-green-800'
                    : pct >= 0.4
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800';
                return (
                  <div
                    key={asg.id}
                    onClick={() => setEditingAssignment(asg)}
                    className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-md cursor-pointer active:scale-95 transition"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{asg.title}</p>
                      <p className="text-xs text-gray-400">
                        Due{' '}
                        {new Date(asg.dueDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${badgeClass}`}>
                      {Number(asg.done)}/{Number(asg.total)} done
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Teacher: Materials tab */}
      {isTeacher && teacherTab === 'materials' && (
        <div className="px-4 mt-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-gray-900">Study Materials</span>
              <span className="text-gray-400 text-sm">{materials.length}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setShowAddMaterial(true)}
            >
              <Plus className="w-5 h-5 text-gray-700" />
            </Button>
          </div>

          {materials.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No materials yet</p>
          ) : (
            <div className="space-y-2">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-md"
                >
                  <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{material.title}</p>
                    {material.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{material.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteMaterial(material.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddMaterial && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-8">
              <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4">
                <h2 className="text-base font-semibold text-gray-900">Add Material</h2>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="Title"
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  autoFocus
                />
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="URL (optional)"
                  value={matUrl}
                  onChange={(e) => setMatUrl(e.target.value)}
                />
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="Description (optional)"
                  value={matDesc}
                  onChange={(e) => setMatDesc(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowAddMaterial(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAddMaterial}
                    disabled={savingMat || !matTitle.trim()}
                  >
                    {savingMat ? 'Saving…' : 'Add'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teacher: Students tab */}
      {isTeacher && teacherTab === 'students' && (
        <div className="px-4 mt-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-gray-900">Students</span>
              <span className="text-gray-400 text-sm">{courseStudents.length}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setShowAddStudent((v) => !v)}
            >
              <Plus className="w-5 h-5 text-gray-700" />
            </Button>
          </div>

          {showAddStudent && (
            <div className="relative mb-3">
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                placeholder="Search by name or email…"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                autoFocus
              />
              {studentResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                  {studentResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleAddStudent(u.id)}
                      disabled={addingStudent}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm"
                    >
                      <span className="font-medium text-gray-900">{u.name ?? u.email}</span>
                      {u.name && <span className="text-gray-400 ml-2 text-xs">{u.email}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {courseStudents.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No students enrolled</p>
          ) : (
            <div className="space-y-2">
              {courseStudents.map((student) => {
                const initials = (student.name ?? student.email)
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
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
                    className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-md"
                  >
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-indigo-600">{initials}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {student.name ?? student.email}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{student.email}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${badgeClass}`}>
                      {Number(student.done)}/{Number(student.total)} done
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New Assignment Dialog */}
      <NewAssignmentDialog
        isOpen={showAddAssignment}
        onOpenChange={setShowAddAssignment}
        onSubmit={handleAddAssignment}
      />

      {/* Edit Assignment Dialog */}
      {editingAssignment && (
        <EditAssignmentDialog
          assignmentId={editingAssignment.id}
          courseId={courseId}
          initialTitle={editingAssignment.title}
          initialDescription={editingAssignment.description}
          initialDueDate={editingAssignment.dueDate}
          initialEvalType={editingAssignment.evalType}
          onClose={() => setEditingAssignment(null)}
          onEval={(taskId, currentScore, evalType) =>
            setEvalDialogState({ taskId, evalType, currentScore })
          }
        />
      )}

      {/* Eval Dialog */}
      {evalDialogState && (
        <EvalDialog
          taskId={evalDialogState.taskId}
          evalType={evalDialogState.evalType}
          currentScore={evalDialogState.currentScore}
          onClose={() => setEvalDialogState(null)}
          onSubmit={handleSubmitEval}
        />
      )}
    </div>
  );
}
