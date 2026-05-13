import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronLeft,
  Plus,
  CheckSquare,
  Folder,
  Users,
  Clock,
  LayoutGrid,
  Calendar,
  FileText,
  UserCircle,
  ChevronDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Course, CourseProgress } from '@/types/courses';

export const Route = createFileRoute('/courses/$courseId')({
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    data: course,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => api.get<Course>(`/courses/${courseId}`),
    retry: false,
  });

  const { data: progress } = useQuery({
    queryKey: ['course', courseId, 'progress'],
    queryFn: () => api.get<CourseProgress>(`/courses/${courseId}/progress`),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center transition-colors">
        <p className="text-gray-400 dark:text-gray-500">{t('courses.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center transition-colors">
        <p className="text-red-500 font-medium mb-4">Error: Could not load course details.</p>
        <Button variant="outline" onClick={() => navigate({ to: '/courses' })}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col transition-colors">
      {/* Header */}
      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/courses' })}
            className="h-8 w-8 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white">
              {course.code}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {course.name || course.semester}
            </p>
          </div>
        </div>

        {/* Mentor Section */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
            {course.lectureTeacherId
              ? `${t('courses.teacherId', 'Teacher ID:')} ${course.lectureTeacherId}`
              : t('courses.mentorName', "Mentor's name")}
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-8 pb-32">
        {/* Tasks Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded">
                <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="font-bold text-gray-900 dark:text-white">{t('nav.tasks')}</h2>
              <span className="text-gray-400 dark:text-gray-500 font-normal">
                {progress?.total || 0}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>
            <Plus className="w-5 h-5 text-gray-900 dark:text-gray-300 cursor-pointer" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: Math.min(progress?.total || 0, 3) }).map((_, i) => (
              <Card
                key={i}
                className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm dark:bg-gray-800 transition-colors"
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {t('courses.taskPlaceholder', 'Task...')}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        {t('tasks.due', 'Due')} 23:59 · {t('courses.subject', 'Subject')}
                      </span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Notes Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <h2 className="font-bold text-gray-900 dark:text-white">{t('nav.notes')}</h2>
              <span className="text-gray-400 dark:text-gray-500 font-normal">0</span>
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>
            <Plus className="w-5 h-5 text-gray-900 dark:text-gray-300 cursor-pointer" />
          </div>

          <div className="space-y-3 text-gray-900 dark:text-gray-100">
            <Card className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm dark:bg-gray-800 transition-colors">
              <CardContent className="p-4 font-medium">Nice</CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm dark:bg-gray-800 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">Hello</span>
                </div>
                <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm dark:bg-gray-800 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="font-medium">Nice</span>
                <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-3 transition-colors">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <NavIcon icon={<LayoutGrid />} label={t('nav.tasks')} />
          <NavIcon icon={<Calendar />} label={t('nav.today')} />
          <NavIcon icon={<FileText />} label={t('nav.notes')} active />
          <NavIcon icon={<UserCircle />} label={t('nav.profile')} />
        </div>
      </div>
    </div>
  );
}

function NavIcon({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}
