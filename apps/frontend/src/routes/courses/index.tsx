import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useCoursesManager } from '@/hooks/useCoursesManager';
import { CourseCard } from '@/components/courses/course-card';

export const Route = createFileRoute('/courses/')({
  component: CoursesPage,
});

function CoursesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    courses,
    isLoadingCourses,
    isError,
    handleOpenCourse,
    handleAddCourse,
    dbUser,
    isLoadingUser,
  } = useCoursesManager();

  console.log('USER:', user);
  console.log('COURSES:', courses);

  const isTeacher =
    !user?.roles || user.roles.some((role) => role === 'TEACHER' || role === 'ADMIN');
  const myCourses = courses.filter((c) => c.enrolled || c.lectureTeacherId === dbUser?.id);
  const otherCourses = courses.filter((c) => !c.enrolled && c.lectureTeacherId !== dbUser?.id);

  if (isLoadingCourses || isLoadingUser || isError) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center transition-colors">
        <p className={isError ? 'text-red-500 font-medium' : 'text-gray-400 dark:text-gray-500'}>
          {isError
            ? 'Error: Could not connect to the Courses API.'
            : t('courses.loading', 'Loading courses...')}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20 transition-colors">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between transition-colors">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.courses')}</h1>
        {isTeacher && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAddCourse}
            className="p-0 h-auto w-auto dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Plus className="w-6 h-6 text-gray-900 dark:text-gray-300" />
          </Button>
        )}
      </div>

      <div className="px-4 py-6 space-y-8">
        {/* My Courses */}
        {myCourses.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {t('courses.myCourses', 'My Courses')}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {myCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onClick={() => handleOpenCourse(course.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Other Courses */}
        {otherCourses.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {t('courses.availableCourses', 'Available Courses')}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {otherCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onClick={() => handleOpenCourse(course.id)}
                />
              ))}
            </div>
          </section>
        )}

        {myCourses.length === 0 && otherCourses.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-10">
            {t('courses.noCourses', 'No courses found.')}
          </p>
        )}
      </div>
    </div>
  );
}
