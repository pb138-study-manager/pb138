import { CheckSquare, Clock, Plus, Users, User } from 'lucide-react';
import type { CourseTaskListItem } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type CourseTasksSectionProps = {
  tasks: CourseTaskListItem[];
  isMentorView: boolean;
  onAddClick: () => void;
};

export function CourseTasksSection({ tasks, isMentorView, onAddClick }: CourseTasksSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded bg-green-100 p-1">
            <CheckSquare className="size-4 text-green-600" />
          </div>
          <h2 className="font-bold text-gray-900">Tasks</h2>
          <span className="font-normal text-gray-400">{tasks.length}</span>
        </div>
        {isMentorView && (
          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onAddClick}>
            <Plus className="size-5 text-gray-900" />
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id} className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-gray-900">{task.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3 shrink-0" />
                    Due {task.dueLabel}
                  </span>
                  {task.target === 'all' ? (
                    <Badge variant="outline" className="gap-1 font-normal">
                      <Users className="size-3" />
                      all students
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 font-normal">
                      <User className="size-3" />
                      {task.targetStudentName ?? 'one student'}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="size-6 shrink-0 rounded-full border-2 border-gray-200" aria-hidden />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
