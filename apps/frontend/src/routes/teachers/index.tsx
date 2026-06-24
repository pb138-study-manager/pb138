import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { TeacherCourseCard, type TeachingCourse } from '@/components/teachers/teacher-course-card';

export const Route = createFileRoute('/teachers/')({
  component: TeachersPage,
});

function TeachersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: courses = [], isPending } = useQuery({
    queryKey: ['teachingCourses'],
    queryFn: () => api.get<TeachingCourse[]>('/courses/teaching').catch(() => []),
  });

  if (isPending) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('teachers.portal', 'Teacher Portal')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('nav.myClasses', 'My Classes')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/courses/new' })}
          className="p-0 h-auto w-auto hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Plus className="w-6 h-6 text-gray-900 dark:text-white" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-3">
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500 font-medium">
              {t('teachers.noCourses', 'No courses yet')}
            </p>
            <p className="text-sm text-gray-300 dark:text-gray-600 mt-1">
              {t('teachers.createFirstCourse', 'Create your first course to get started')}
            </p>
            <Button className="mt-4" onClick={() => navigate({ to: '/courses/new' })}>
              <Plus className="w-4 h-4 mr-2" />
              {t('courses.createCourse', 'Create Course')}
            </Button>
          </div>
        ) : (
          courses.map((course) => (
            <TeacherCourseCard
              key={course.id}
              course={course}
              onClick={() => navigate({ to: '/courses/$courseId', params: { courseId: String(course.id) } })}
            />
          ))
        )}
      </div>
    </div>
  );
}
