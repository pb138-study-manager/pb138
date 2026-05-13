import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Course } from '@/types/courses';
import { useTranslation } from 'react-i18next';

export function CourseCard({ course, onClick }: { course: Course; onClick: () => void }) {
  const { t } = useTranslation();

  return (
    <Card
      onClick={onClick}
      className="rounded-2xl shadow-sm cursor-pointer active:scale-95 transition-all dark:bg-gray-800 dark:border-gray-700"
    >
      <CardContent className="p-4 space-y-3 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{course.code}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate line-clamp-2 whitespace-normal">
              {course.name || course.semester}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px] truncate max-w-[80px]">
            {course.lectureSchedule || course.semester}
          </Badge>
        </div>

        <div className="mt-auto pt-2">
          {course.progress ? (
            <>
              <div className="w-full bg-gray-100 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-green-500 dark:bg-green-400 h-1 rounded-full transition-all"
                  style={{ width: `${course.progress.percent}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                {course.progress.done}/{course.progress.total} {t('courses.assignments')}
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              {course.enrolled
                ? t('courses.noAssignments', 'No assignments')
                : t('courses.notEnrolled', 'Not enrolled')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
