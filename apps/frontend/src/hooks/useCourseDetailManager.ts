import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Task } from '@/types';
import { useTranslation } from 'react-i18next';

export interface Course {
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

export interface CourseNote {
  id: number;
  title: string;
  courseId: number | null;
  folderId: number | null;
}

export interface StudyMaterial {
  id: number;
  title: string;
  url: string | null;
  description: string | null;
}

export interface CourseAssignment {
  id: number;
  title: string;
  description: string | null;
  dueDate: string;
  evalType: 'none' | 'pass_fail' | 'graded';
  total: number;
  done: number;
}

export interface CourseStudent {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  total: number;
  done: number;
}

export interface CourseEval {
  assignmentTitle: string;
  dueDate: string;
  evalType: 'none' | 'pass_fail' | 'graded';
  score: number;
  feedback: string;
  evaluatedAt: string;
}

export interface StudentTask {
  taskId: number;
  status: string;
  assignmentId: number;
  assignmentTitle: string;
  dueDate: string;
  evalScore: number | null;
  evalFeedback: string | null;
}

interface UseCourseDetailManagerProps {
  courseId: string;
  isTeacher: boolean;
  activeTab: string;
  selectedStudentId: number | null;
  editingAssignmentId?: number;
}

export function useCourseDetailManager({
  courseId,
  isTeacher,
  activeTab,
  selectedStudentId,
  editingAssignmentId,
}: UseCourseDetailManagerProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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

  const { data: myEvals = [], isError: evalsError } = useQuery({
    queryKey: ['myEvals', courseId],
    queryFn: () => api.get<CourseEval[]>(`/courses/${courseId}/my-evals`),
    enabled: activeTab === 'evaluations',
  });

  const { data: courseAssignments = [] } = useQuery({
    queryKey: ['courseAssignments', courseId],
    queryFn: () => api.get<CourseAssignment[]>(`/courses/${courseId}/assignments`).catch(() => []),
    enabled: isTeacher,
  });

  const { data: courseStudents = [] } = useQuery({
    queryKey: ['courseStudents', courseId],
    queryFn: () => api.get<CourseStudent[]>(`/courses/${courseId}/students`).catch(() => []),
    enabled: isTeacher,
  });

  const { data: studentTasks = [] } = useQuery({
    queryKey: ['studentDetail', courseId, selectedStudentId],
    queryFn: () =>
      api.get<StudentTask[]>(`/courses/${courseId}/students/${selectedStudentId}`).catch(() => []),
    enabled: selectedStudentId !== null,
  });

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

  const addMaterialMutation = useMutation({
    mutationFn: (data: { title: string; url?: string; description?: string }) =>
      api.post(`/courses/${courseId}/materials`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] });
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: (materialId: number) => api.delete(`/courses/${courseId}/materials/${materialId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] }),
  });

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
      queryClient.invalidateQueries({ queryKey: ['assignmentStudents', editingAssignmentId] }),
  });

  const addStudentMutation = useMutation({
    mutationFn: (userId: number) => api.post(`/courses/${courseId}/students`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseStudents', courseId] });
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

  const toggleTaskMutation = useMutation({
    mutationFn: (id: number) => api.patch<Task>(`/tasks/${id}/toggle-done`, {}),
    onSuccess: (updated) => {
      queryClient.setQueryData<Task[]>(['tasks'], (prev = []) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
    },
  });

  const editTaskMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      subtasksToAdd,
      subtaskIdsToDelete,
    }: {
      id: number;
      data: Partial<Task>;
      subtasksToAdd: string[];
      subtaskIdsToDelete: number[];
    }) => {
      await Promise.all([
        api.patch<Task>(`/tasks/${id}`, data),
        ...subtaskIdsToDelete.map((subId: number) => api.delete(`/tasks/${subId}`)),
      ]);
      await Promise.all(
        subtasksToAdd.map((title: string) =>
          api.post<Task>('/tasks', { title, dueDate: data.dueDate as string, parentId: id })
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: (_, id) =>
      queryClient.setQueryData<Task[]>(['tasks'], (prev = []) => prev.filter((t) => t.id !== id)),
  });

  const createNoteMutation = useMutation({
    mutationFn: (title: string) =>
      api.post('/notes', { title, description: '', courseId: Number(courseId) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; dueDate: string }) =>
      api.post<Task>('/tasks', {
        title: data.title,
        dueDate: data.dueDate,
        courseId: Number(courseId),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return {
    course,
    courseLoading,
    tasks: allTasks.filter((t) => t.courseId === Number(courseId)),
    notes: allNotes.filter((n) => n.courseId === Number(courseId)),
    materials,
    myEvals,
    evalsError,
    courseAssignments,
    courseStudents,
    studentTasks,
    studentQuery,
    setStudentQuery,
    studentResults,
    studentError,
    setStudentError,
    addMaterial: (
      data: { title: string; url?: string; description?: string },
      onSuccess?: () => void
    ) => addMaterialMutation.mutate(data, { onSuccess }),
    isAddingMaterial: addMaterialMutation.isPending,
    deleteMaterial: (id: number) => deleteMaterialMutation.mutate(id),
    addAssignment: (data: {
      title: string;
      description?: string;
      dueDate: string;
      evalType: 'none' | 'pass_fail' | 'graded';
      targetUserId?: number;
    }) => addAssignmentMutation.mutate(data),
    submitEval: (taskId: number, score: number, feedback: string) =>
      submitEvalMutation.mutate({ taskId, score, feedback }),
    addStudent: (userId: number, onSuccess?: () => void) =>
      addStudentMutation.mutate(userId, { onSuccess }),
    isAddingStudent: addStudentMutation.isPending,
    toggleTask: (id: number) => toggleTaskMutation.mutate(id),
    editTask: (
      id: number,
      data: Partial<Task>,
      subtasksToAdd: string[],
      subtaskIdsToDelete: number[]
    ) => editTaskMutation.mutate({ id, data, subtasksToAdd, subtaskIdsToDelete }),
    deleteTask: (id: number) => deleteTaskMutation.mutate(id),
    createNote: (title: string) => createNoteMutation.mutate(title),
    createTask: (title: string, dueDate: string, onSuccess?: () => void) =>
      createTaskMutation.mutate({ title, dueDate }, { onSuccess }),
    isCreatingTask: createTaskMutation.isPending,
  };
}
