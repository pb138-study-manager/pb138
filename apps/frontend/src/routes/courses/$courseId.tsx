import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AddCourseTaskDialog, type NewCourseTaskPayload } from '@/components/courses/add-course-task-dialog';
import { AddStudyMaterialDialog, type NewStudyMaterialPayload } from '@/components/courses/add-study-material-dialog';
import { getCourseDetailMock } from '@/components/courses/course-mock-data';
import { CourseStudyMaterialsSection } from '@/components/courses/course-study-materials-section';
import { CourseTasksSection } from '@/components/courses/course-tasks-section';
import type { CourseStudyMaterial, CourseTaskListItem } from '@/types/index';

export const Route = createFileRoute('/courses/$courseId')({
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { courseId } = useParams({ from: '/courses/$courseId' });
  const navigate = useNavigate();

  const base = useMemo(() => getCourseDetailMock(courseId), [courseId]);
  const [isMentorView, setIsMentorView] = useState(false);
  const [materials, setMaterials] = useState<CourseStudyMaterial[]>(() => [...base.materials]);
  const [tasks, setTasks] = useState<CourseTaskListItem[]>(() => [...base.tasks]);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const handleAddMaterial = (payload: NewStudyMaterialPayload) => {
    const id = `m-${Date.now()}`;
    setMaterials((prev) => [
      {
        id,
        title: payload.title,
        description: payload.description,
        url: payload.url,
      },
      ...prev,
    ]);
  };

  const handleAddTask = (payload: NewCourseTaskPayload) => {
    const student =
      payload.target === 'one'
        ? base.students.find((s) => s.id === payload.studentId) ?? null
        : null;
    const item: CourseTaskListItem = {
      id: `t-${Date.now()}`,
      title: payload.title,
      dueLabel: payload.dueLabel,
      subject: payload.subject,
      target: payload.target,
      targetStudentName: student?.name ?? null,
    };
    setTasks((prev) => [item, ...prev]);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="space-y-4 px-4 py-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/courses' })} className="size-8">
            <ChevronLeft className="size-6" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight text-gray-900">{base.code}</h1>
            <p className="text-xs uppercase tracking-wide text-gray-500">{base.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-0.5">
          <div className="size-10 shrink-0 rounded-full bg-gray-200" aria-hidden />
          <span className="text-sm font-medium text-gray-700">{base.mentorName}</span>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2">
          <Checkbox
            checked={isMentorView}
            onCheckedChange={(checked) => setIsMentorView(checked)}
            id="course-mentor-toggle"
          />
          <Label htmlFor="course-mentor-toggle" className="cursor-pointer text-sm font-normal text-gray-700">
            Teacher mode (add materials and tasks)
          </Label>
        </div>
      </div>

      <div className="flex-1 space-y-10 px-4 pb-16">
        <CourseTasksSection
          tasks={tasks}
          isMentorView={isMentorView}
          onAddClick={() => setTaskDialogOpen(true)}
        />
        <CourseStudyMaterialsSection
          materials={materials}
          isMentorView={isMentorView}
          onAddClick={() => setMaterialDialogOpen(true)}
        />
      </div>

      <AddStudyMaterialDialog
        open={materialDialogOpen}
        onOpenChange={setMaterialDialogOpen}
        onSubmit={handleAddMaterial}
      />
      <AddCourseTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        students={base.students}
        defaultSubject={base.code}
        onSubmit={handleAddTask}
      />
    </div>
  );
}
