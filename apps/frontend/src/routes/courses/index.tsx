import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useRoleMode } from '@/lib/roleMode'
import { getCourseColor } from '@/lib/courseColors'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/courses/')({
  component: CoursesPage,
})

// Samostatný komponent lebo volá hook — hooky sa nedajú volať vo vnútri .map()
function CourseProgressBar({ courseId, accentClass }: { courseId: number; accentClass: string }) {
  const { t } = useTranslation()
  const { data } = useQuery({
    queryKey: ['course-progress', courseId],
    queryFn: () =>
      api
        .get<{ done: number; total: number; percent: number }>(`/courses/${courseId}/progress`)
        .catch(() => ({ done: 0, total: 0, percent: 0 })),
  })

  if (!data || data.total === 0) return null
  const pct = data.percent

  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>{data.done}/{data.total} {t('courses.tasks', 'tasks')}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${accentClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

interface Course {
  id: number;
  code: string;
  name: string | null;
  semester: string;
  color: string | null;
  lectureSchedule: string | null;
  seminarSchedule: string | null;
  enrolled: boolean;
}

function CoursesPage() {
  const navigate = useNavigate()
  const { mode } = useRoleMode()
  const { t } = useTranslation()
  const isTeacher = mode === 'teacher'

  const { data: courses = [], isPending } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get<Course[]>('/courses').catch(() => []),
  })

  // Students see only enrolled; teachers see all with enrolled indicator
  const visibleCourses = isTeacher ? courses : courses.filter((c) => c.enrolled)

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-6">
        <div className="grid grid-cols-2 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('courses.title', 'Courses')}</h1>
        {isTeacher && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/courses/new' })}
            className="p-0 h-auto w-auto"
          >
            <Plus className="w-6 h-6 text-gray-900 dark:text-white" />
          </Button>
        )}
      </div>

      {/* Grid */}
      <div className="px-4 py-6 grid grid-cols-2 gap-4">
        {visibleCourses.length === 0 ? (
          <div className="col-span-2 text-center text-gray-400 py-12">
            {isTeacher ? t('courses.noCoursesTeacher', 'No courses yet') : t('courses.noCoursesStudent', 'You are not enrolled in any courses yet')}
          </div>
        ) : (
          visibleCourses.map((course) => {
            const color = getCourseColor(course.id)
            return (
              <div
                key={course.id}
                onClick={() => navigate({ to: `/courses/${course.id}` })}
                className="flex gap-3 rounded-2xl p-4 cursor-pointer active:scale-95 transition border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md"
              >
                {/* Left color accent bar */}
                <div className={`w-1 self-stretch rounded-full shrink-0 ${color.accent}`} />

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <h3 className={`font-bold text-sm ${color.text}`}>{course.code}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-snug">
                      {course.name ?? course.code}
                    </p>
                  </div>
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {course.semester}
                  </span>
                  <CourseProgressBar courseId={course.id} accentClass={color.accent} />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
