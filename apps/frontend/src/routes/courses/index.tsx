import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Plus, CheckSquare, FileText } from 'lucide-react'

export const Route = createFileRoute('/courses/')({
  component: CoursesPage,
})

interface Course {
  id: string
  code: string
  name: string
  progress: [number, number]
  time: string
}

const mockCourses: Course[] = [
  { id: '1', code: 'CODE123', name: 'Full name of the course', progress: [1, 4], time: '10:30 AM' },
  { id: '2', code: 'CODE123', name: 'Full name of the course', progress: [2, 4], time: '10:30 AM' },
  { id: '3', code: 'CODE123', name: 'Full name of the course', progress: [1, 4], time: '10:30 AM' },
]

function CoursesPage() {
  const navigate = useNavigate()

  const handleOpenCourse = (id: string) => {
    navigate({ to: `/courses/${id}` })
  }

  const handleAddCourse = () => {
    navigate({ to: '/courses/new' })
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddCourse}
          className="p-0 h-auto w-auto"
        >
          <Plus className="w-6 h-6 text-gray-900" />
        </Button>
      </div>

      {/* Courses Grid */}
      <div className="px-4 py-6 grid grid-cols-2 gap-4">
        {mockCourses.map((course) => {
          const progressPercent = (course.progress[0] / course.progress[1]) * 100

          return (
            <Card
              key={course.id}
              onClick={() => handleOpenCourse(course.id)}
              className="rounded-2xl shadow-sm cursor-pointer active:scale-95 transition"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{course.code}</h3>
                    <p className="text-xs text-gray-500">{course.name}</p>
                  </div>
                  <Badge variant="secondary">{course.time}</Badge>
                </div>

                {/* Progress */}
                <div className="w-full bg-gray-100 h-1 rounded-full">
                  <div
                    className="bg-green-500 h-1 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="text-xs text-gray-400">
                  {course.progress[0]}/{course.progress[1]} assignments
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}