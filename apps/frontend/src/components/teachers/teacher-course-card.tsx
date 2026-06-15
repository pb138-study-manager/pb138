import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface TeachingCourse {
  id: number;
  code: string;
  name: string | null;
  semester: string;
  color: string | null;
  lectureSchedule: string | null;
  studentCount: number;
}

interface Props {
  course: TeachingCourse;
  onClick: () => void;
}

export function TeacherCourseCard({ course, onClick }: Props) {
  const { t } = useTranslation();

  return (
    <Card
      className="border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98] transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-1 self-stretch rounded-full shrink-0"
            style={{ backgroundColor: course.color ?? '#6366f1' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3
                className="text-base font-bold truncate"
                style={{ color: course.color ?? '#6366f1' }}
              >
                {course.code}
              </h3>
              <Badge
                variant="secondary"
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 shrink-0"
              >
                {course.semester}
              </Badge>
            </div>
            {course.name && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{course.name}</p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <Users className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {course.studentCount} {t('courses.students', 'students')}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
