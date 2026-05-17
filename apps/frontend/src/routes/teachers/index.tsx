import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, BookOpen, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const Route = createFileRoute('/teachers/')({
  component: TeachersPage,
});

interface TeachingCourse {
  id: number;
  code: string;
  name: string | null;
  semester: string;
  color: string | null;
  lectureSchedule: string | null;
  studentCount: number;
}

function TeachersPage() {
  const navigate = useNavigate();

  const { data: courses = [], isPending } = useQuery({
    queryKey: ['teachingCourses'],
    queryFn: () => api.get<TeachingCourse[]>('/courses/teaching').catch(() => []),
  });

  if (isPending) {
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Portal</h1>
          <p className="text-sm text-gray-500">My Classes</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/courses/new' })}
          className="p-0 h-auto w-auto"
        >
          <Plus className="w-6 h-6 text-gray-900" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-3">
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No courses yet</p>
            <p className="text-sm text-gray-300 mt-1">Create your first course to get started</p>
            <Button
              className="mt-4"
              onClick={() => navigate({ to: '/courses/new' })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
          </div>
        ) : (
          courses.map((course) => (
            <Card
              key={course.id}
              className="border-0 rounded-2xl shadow-sm cursor-pointer active:scale-[0.98] transition"
              onClick={() => navigate({ to: `/courses/${course.id}` })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: course.color ?? '#6366f1' }}
                  >
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-base font-bold text-gray-900">{course.code}</h3>
                      <Badge variant="secondary" className="text-xs">{course.semester}</Badge>
                    </div>
                    {course.name && (
                      <p className="text-sm text-gray-500 truncate">{course.name}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-400">{course.studentCount} students</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
