import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { ChevronLeft, Plus, CheckSquare, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Task, TaskStatus } from '@/types';
import TaskCard from '@/components/tasks/tasks-card';

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

function CourseDetailPage() {
  const { courseId } = useParams({ from: '/courses/$courseId' });
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'materials'>('tasks');
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<CourseNote[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);

  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleToggle(id: number) {
    const updated = await api.patch<Task>(`/tasks/${id}/toggle-done`, {});
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
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
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
  }

  async function handleDelete(id: number) {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function createTask() {
    if (!newTaskTitle.trim() || !newTaskDate) return;
    setSaving(true);
    try {
      const created = await api.post<Task>('/tasks', {
        title: newTaskTitle.trim(),
        dueDate: newTaskDate,
        courseId: Number(courseId),
      });
      setTasks((prev) => [...prev, created]);
      setNewTaskTitle('');
      setNewTaskDate('');
      setShowNewTask(false);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    Promise.all([
      api.get<Course>(`/courses/${courseId}`),
      api.get<Task[]>('/tasks'),
      api.get<CourseNote[]>('/notes'),
      api.get<StudyMaterial[]>(`/courses/${courseId}/materials`),
    ])
      .then(([courseData, tasksData, notesData, materialsData]) => {
        setCourse(courseData);
        setTasks(tasksData.filter((t) => t.courseId === Number(courseId)));
        setNotes(notesData.filter((n) => n.courseId === Number(courseId)));
        setMaterials(materialsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);


  if (loading) {
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.code}</h1>
            <p className="text-sm text-gray-500">{course.name ?? course.code}</p>
          </div>
        </div>

        {/* Mentor */}
        <div
          className="flex items-center gap-3 mb-4 cursor-pointer"
          onClick={() => course.lectureTeacherId && navigate({ to: '/profile' })}
        >
          {course.teacherAvatar ? (
            <img src={course.teacherAvatar} className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {course.teacherName ?? 'Unknown teacher'}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-4">
        {(['tasks', 'notes', 'materials'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tasks sekcia */}
      {activeTab === 'tasks' && (
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
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      onEditFull={handleEditFull}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
              {tasks.filter((t) => t.assignmentId === null).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Created by me</p>
                  {tasks.filter((t) => t.assignmentId === null).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      onEditFull={handleEditFull}
                      onDelete={handleDelete}
                    />
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

      {/* Notes sekcia */}
      {activeTab === 'notes' && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-gray-900">Notes</span>
              <span className="text-gray-400 text-sm">{notes.length}</span>
            </div>
            <Button variant="ghost" size="icon" className="w-7 h-7">
              <Plus className="w-5 h-5 text-gray-700" />
            </Button>
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

      {/* Materials sekcia */}
      {activeTab === 'materials' && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-gray-900">Study Materials</span>
              <span className="text-gray-400 text-sm">{materials.length}</span>
            </div>
            <div className="w-7 h-7" />
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
    </div>
  );
}