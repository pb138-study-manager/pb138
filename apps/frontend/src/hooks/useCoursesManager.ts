import { useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Course, CourseProgress, CreateCourseDto } from '@/types/courses';

export function useCoursesManager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: courses = [], isPending: isLoadingCourses, isError } = useQuery({
    queryKey: ['courses'],
    retry: false, // Fail fast if backend is not ready
    queryFn: async () => {
      const data = await api.get<Course[]>('/courses');
      const withProgress = await Promise.all(
        data.map(async (course) => {
          if (course.enrolled) {
            try {
              const progress = await api.get<CourseProgress>(`/courses/${course.id}/progress`);
              return { ...course, progress };
            } catch (e) {
              return course;
            }
          }
          return course;
        })
      );
      return withProgress;
    },
  });

  const { data: dbUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.get<{ id: number }>('/users/me'),
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: CreateCourseDto) => {
      return api.post<Course>('/courses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  const handleOpenCourse = (id: number) => {
    navigate({ to: `/courses/${id}` });
  };

  const handleAddCourse = () => {
    navigate({ to: '/courses/new' });
  };

  return {
    courses,
    isLoadingCourses,
    isError,
    handleOpenCourse,
    handleAddCourse,
    createCourse: createCourseMutation.mutateAsync,
    isCreatingCourse: createCourseMutation.isPending,
    dbUser,
    isLoadingUser,
  };
}