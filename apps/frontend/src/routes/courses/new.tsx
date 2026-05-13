import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCoursesManager } from '@/hooks/useCoursesManager';

export const Route = createFileRoute('/courses/new')({
  component: NewCoursePage,
});

function NewCoursePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { createCourse, isCreatingCourse } = useCoursesManager();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [semester, setSemester] = useState('');

  const handleBack = () => {
    navigate({ to: '/courses' });
  };

  const handleCreate = async () => {
    if (!code.trim() || !semester.trim()) return;

    try {
      await createCourse({
        code: code.trim(),
        name: name.trim() || undefined,
        semester: semester.trim(),
      });
      navigate({ to: '/courses' });
    } catch (error) {
      console.error('Failed to create course:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 transition-colors">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-9 w-9 rounded-full dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="w-5 h-5 text-gray-900 dark:text-gray-300" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('courses.newCourse', 'New Course')}
        </h1>
      </div>

      {/* Form Container */}
      <div className="px-4 py-8 max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8 space-y-6 transition-colors">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('courses.detailsTitle', 'Course Details')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('courses.detailsDesc', 'Enter the basic information for the new course.')}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('courses.courseCode', 'Course Code')}
              </label>
              <Input
                placeholder={t('courses.courseCodePlaceholder', 'e.g. PB138')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-12 rounded-xl dark:bg-gray-900 dark:border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('courses.courseName', 'Course Name')}
              </label>
              <Input
                placeholder={t('courses.courseNamePlaceholder', 'Full name of the course')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl dark:bg-gray-900 dark:border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('courses.semester', 'Semester')}
              </label>
              <Input
                placeholder={t('courses.semesterPlaceholder', 'e.g. Spring 2026')}
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="h-12 rounded-xl dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleCreate}
              disabled={isCreatingCourse || !code.trim() || !semester.trim()}
              className="w-full h-12 rounded-xl font-semibold dark:text-gray-900 dark:bg-gray-100 dark:hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isCreatingCourse
                ? t('courses.creating', 'Creating...')
                : t('courses.createCourse', 'Create Course')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
