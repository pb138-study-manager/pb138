import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { api } from '@/lib/api';

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
}

function CoursesPage() {
  const navigate = useNavigate()

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Course[]>('/courses/enrolled')
      .then((data) => setCourses(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleOpenCourse = (id: string) => {
    navigate({ to: `/courses/${id}` })
  }

  const handleAddCourse = () => {
    navigate({ to: '/courses/new' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
        {courses.length === 0 ? (
          <div className="col-span-2 text-center text-gray-400 py-12">
            No courses yet
          </div>
        ) : courses.map((course) => (
          <Card
            key={course.id}
            onClick={() => handleOpenCourse(String(course.id))}
            className="rounded-2xl shadow-sm cursor-pointer active:scale-95 transition"
          >
            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="font-bold text-gray-900">{course.code}</h3>
                <p className="text-xs text-gray-500">{course.name ?? course.code}</p>
              </div>
              <Badge variant="secondary">{course.semester}</Badge>
              {course.lectureSchedule && (
                <p className="text-xs text-gray-400">{course.lectureSchedule}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}