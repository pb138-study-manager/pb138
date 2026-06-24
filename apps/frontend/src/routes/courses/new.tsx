import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

const schema = z.object({
  code: z.string().min(1, { message: 'Course code is required' }),
  name: z.string(),
  semester: z.string().min(1, { message: 'Semester is required' }),
});

type CourseForm = z.infer<typeof schema>;

export const Route = createFileRoute('/courses/new')({
  component: NewCoursePage,
});

function NewCoursePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<CourseForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { code: '', name: '', semester: '' },
  });

  async function onFormSubmit(data: CourseForm) {
    try {
      await api.post('/courses', {
        code: data.code.trim(),
        name: data.name.trim() || undefined,
        semester: data.semester.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['teachingCourses'] });
      navigate({ to: '/teachers' });
    } catch {
      setError('root', {
        message: t('courses.createError', 'Failed to create course. Make sure you have the TEACHER role.'),
      });
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/teachers' })}
          className="p-0 h-auto w-auto"
        >
          <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('courses.newCourse', 'New Course')}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="px-4 py-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('courses.courseCode', 'Course Code')} <span className="text-red-500">*</span>
          </label>
          <Input placeholder={t('courses.courseCodePlaceholder', 'e.g. PB138')} {...register('code')} />
          {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('courses.courseName', 'Course Name')}
          </label>
          <Input
            placeholder={t('courses.courseNamePlaceholder', 'Full name of the course')}
            {...register('name')}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('courses.semester', 'Semester')} <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder={t('courses.semesterPlaceholder', 'e.g. Spring 2026')}
            {...register('semester')}
          />
          {errors.semester && <p className="text-xs text-red-500">{errors.semester.message}</p>}
        </div>

        {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

        <Button type="submit" className="w-full mt-4" disabled={isSubmitting || !isValid}>
          {isSubmitting
            ? t('common.creating', 'Creating…')
            : t('courses.createCourse', 'Create Course')}
        </Button>
      </form>
    </div>
  );
}
