import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useRoleMode } from '@/lib/roleMode'
import { getCourseColor } from '@/lib/courseColors'

export const Route = createFileRoute('/courses/')({
  component: CoursesPage,
})

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
        {isTeacher && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/courses/new' })}
            className="p-0 h-auto w-auto"
          >
            <Plus className="w-6 h-6 text-gray-900" />
          </Button>
        )}
      </div>

      {/* Grid */}
      <div className="px-4 py-6 grid grid-cols-2 gap-4">
        {visibleCourses.length === 0 ? (
          <div className="col-span-2 text-center text-gray-400 py-12">
            {isTeacher ? 'No courses yet' : 'You are not enrolled in any courses yet'}
          </div>
        ) : (
          visibleCourses.map((course) => {
            const color = getCourseColor(course.id)
            return (
              <div
                key={course.id}
                onClick={() => navigate({ to: `/courses/${course.id}` })}
                className={`rounded-2xl p-4 cursor-pointer active:scale-95 transition border space-y-3 ${color.bg} ${color.border}`}
              >
                <div className={`w-3 h-3 rounded-full ${color.accent}`} />
                <div>
                  <h3 className={`font-bold ${color.text}`}>{course.code}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{course.name ?? course.code}</p>
                </div>
                <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 text-gray-600 dark:text-gray-300">
                  {course.semester}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
