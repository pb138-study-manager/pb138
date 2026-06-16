import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/courses/new')({
  component: NewCoursePage,
});

function NewCoursePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [semester, setSemester] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!code.trim() || !semester.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/courses', {
        code: code.trim(),
        name: name.trim() || undefined,
        semester: semester.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['teachingCourses'] });
      navigate({ to: '/teachers' });
    } catch {
      setError(
        t('courses.createError', 'Failed to create course. Make sure you have the TEACHER role.')
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      {/* Header */}
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

      {/* Form */}
      <div className="px-4 py-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('courses.courseCode', 'Course Code')} <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder={t('courses.courseCodePlaceholder', 'e.g. PB138')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('courses.courseName', 'Course Name')}
          </label>
          <Input
            placeholder={t('courses.courseNamePlaceholder', 'Full name of the course')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('courses.semester', 'Semester')} <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder={t('courses.semesterPlaceholder', 'e.g. Spring 2026')}
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          onClick={handleCreate}
          className="w-full mt-4"
          disabled={saving || !code.trim() || !semester.trim()}
        >
          {saving ? t('common.creating', 'Creating…') : t('courses.createCourse', 'Create Course')}
        </Button>
      </div>
    </div>
  );
}
