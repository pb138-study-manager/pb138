import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useRoleMode } from '@/lib/roleMode'

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
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
          visibleCourses.map((course) => (
            <Card
              key={course.id}
              onClick={() => navigate({ to: `/courses/${course.id}` })}
              className="rounded-2xl shadow-md cursor-pointer active:scale-95 transition"
            >
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-gray-900">{course.code}</h3>
                  <p className="text-xs text-gray-500 truncate">{course.name ?? course.code}</p>
                </div>
                <Badge variant="secondary">{course.semester}</Badge>
                {course.lectureSchedule && (
                  <p className="text-xs text-gray-400">{course.lectureSchedule}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
