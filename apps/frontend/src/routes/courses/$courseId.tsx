import { useState } from 'react';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useRoleMode } from '@/lib/roleMode';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import StudentTasksTab from '@/components/courses/student-tasks-tab';
import StudentNotesTab from '@/components/courses/student-notes-tab';
import StudentMaterialsTab from '@/components/courses/student-materials-tab';
import StudentEvaluationsTab from '@/components/courses/student-evaluations-tab';
import TeacherAssignmentsTab from '@/components/courses/teacher-assignments-tab';
import TeacherMaterialsTab from '@/components/courses/teacher-materials-tab';
import TeacherStudentsTab from '@/components/courses/teacher-students-tab';

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

function CourseDetailPage() {
  const { courseId } = useParams({ from: '/courses/$courseId' });
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'materials' | 'evaluations'>(
    'tasks'
  );

  const { data: course, isPending: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => api.get<Course>(`/courses/${courseId}`),
  });

  const { mode } = useRoleMode();
  const isTeacher = mode === 'teacher';

  const [teacherTab, setTeacherTab] = useState<'assignments' | 'materials' | 'students'>(
    'assignments'
  );

  if (courseLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">{t('courses.notFound', 'Course not found')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="px-4 py-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/courses' })}
            className="size-8 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="size-6" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{course.code}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{course.name ?? course.code}</p>
          </div>
        </div>

        {/* Teacher info — only shown in student mode */}
        {!isTeacher && (
          <div className="flex items-center gap-3 mb-4">
            {course.teacherAvatar ? (
              <img
                src={course.teacherAvatar}
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
            )}
            <span className="text-sm font-medium text-gray-700">
              {course.teacherName ?? t('courses.unknownTeacher', 'Unknown teacher')}
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      {isTeacher ? (
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-4">
          {(['assignments', 'materials', 'students'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTeacherTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                teacherTab === tab
                  ? 'border-gray-800 dark:border-gray-200 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {t(`courses.tabs.${tab}`, tab)}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-4">
          {(['tasks', 'notes', 'materials', 'evaluations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-gray-800 dark:border-gray-200 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {t(`courses.tabs.${tab}`, tab)}
            </button>
          ))}
        </div>
      )}

      {/* Tasks */}
      {!isTeacher && activeTab === 'tasks' && <StudentTasksTab courseId={courseId as string} />}

      {/* Notes */}
      {!isTeacher && activeTab === 'notes' && <StudentNotesTab courseId={courseId as string} />}

      {/* Materials (student view) */}
      {!isTeacher && activeTab === 'materials' && (
        <StudentMaterialsTab courseId={courseId as string} />
      )}

      {/* Evaluations */}
      {!isTeacher && activeTab === 'evaluations' && (
        <StudentEvaluationsTab courseId={courseId as string} />
      )}

      {/* Teacher: Assignments tab */}
      {isTeacher && teacherTab === 'assignments' && (
        <TeacherAssignmentsTab courseId={courseId as string} />
      )}

      {/* Teacher: Materials tab */}
      {isTeacher && teacherTab === 'materials' && (
        <TeacherMaterialsTab courseId={courseId as string} />
      )}

      {/* Teacher: Students tab */}
      {isTeacher && teacherTab === 'students' && (
        <TeacherStudentsTab courseId={courseId as string} />
      )}
    </div>
  );
}
