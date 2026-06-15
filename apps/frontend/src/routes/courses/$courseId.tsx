import { useState } from 'react';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { PublicProfileModal } from '@/components/profile/public-profile-modal';
import { ChevronLeft, CheckSquare, FileText, BookOpen, Star, ClipboardList, Users, Plus } from 'lucide-react';
import { FilterControl, type FilterGroup } from '@/components/shared/FilterControl';
import { useRoleMode } from '@/lib/roleMode';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Task } from '@/types';
import { useTranslation } from 'react-i18next';
import StudentTasksTab from '@/components/courses/student-tasks-tab';
import StudentNotesTab from '@/components/courses/student-notes-tab';
import StudentMaterialsTab from '@/components/courses/student-materials-tab';
import StudentEvaluationsTab from '@/components/courses/student-evaluations-tab';
import TeacherAssignmentsTab from '@/components/courses/teacher-assignments-tab';
import TeacherMaterialsTab from '@/components/courses/teacher-materials-tab';
import TeacherStudentsTab from '@/components/courses/teacher-students-tab';
import TeacherEvaluationsTab from '@/components/courses/teacher-evaluations-tab';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';

export const Route = createFileRoute('/courses/$courseId')({
  component: CourseDetailPage,
});

interface Course {
  id: number;
  code: string;
  name: string | null;
  semester: string;
  lectureSchedule: string | null;
  seminarSchedule: string | null;
  lectureTeacherId: number | null;
  teacherName: string | null;
  teacherAvatar: string | null;
  enrolled: boolean;
}

function CourseDetailPage() {
  const { courseId } = useParams({ from: '/courses/$courseId' });
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'materials' | 'evaluations'>(
    'tasks'
  );
  const [viewingTeacherId, setViewingTeacherId] = useState<number | null>(null);
  const [tasksAddOpen, setTasksAddOpen] = useState(false);
  const [notesAddOpen, setNotesAddOpen] = useState(false);
  const [taskFilterTags, setTaskFilterTags] = useState<Set<string>>(new Set());

  const { data: course, isPending: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => api.get<Course>(`/courses/${courseId}`),
  });

  const { mode } = useRoleMode();
  const isTeacher = mode === 'teacher';

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').catch(() => []),
    enabled: !isTeacher,
  });
  const courseTasks = allTasks.filter((t) => t.courseId === Number(courseId));
  const allTaskTags = Array.from(new Set(courseTasks.flatMap((t) => t.tags ?? []))).sort();

  const taskFilterGroups: FilterGroup[] = allTaskTags.length > 0 ? [{
    type: 'tags' as const,
    label: 'Tags',
    options: allTaskTags.map((tag) => ({ key: tag, label: tag })),
    active: taskFilterTags,
    onToggle: (key) => setTaskFilterTags((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    }),
  }] : [];

  const [teacherTab, setTeacherTab] = useState<'assignments' | 'materials' | 'students' | 'evaluations'>(
    'assignments'
  );

  if (courseLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">{t('courses.notFound', 'Course not found')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/courses' })}
            className="size-8 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="size-6" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{course.code}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{course.name ?? course.code}</p>
          </div>
        </div>

        {/* Teacher info — only shown in student mode */}
        {!isTeacher && (
          <button
            className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity text-left"
            onClick={() => course.lectureTeacherId && setViewingTeacherId(course.lectureTeacherId)}
          >
            {course.teacherAvatar ? (
              <img
                src={course.teacherAvatar}
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {course.teacherName ?? t('courses.unknownTeacher', 'Unknown teacher')}
            </span>
          </button>
        )}
      </div>

      {/* Tab bar */}
      {isTeacher ? (
        <SegmentedTabs
          className="px-4"
          variant="underline"
          value={teacherTab}
          onChange={(key) => setTeacherTab(key as typeof teacherTab)}
          items={[
            { key: 'assignments', icon: <ClipboardList size={14} />, label: t('courses.tabs.assignments', 'Assignments') },
            { key: 'materials', icon: <BookOpen size={14} />, label: t('courses.tabs.materials', 'Materials') },
            { key: 'students', icon: <Users size={14} />, label: t('courses.tabs.students', 'Students') },
            { key: 'evaluations', icon: <Star size={14} />, label: t('courses.tabs.evaluations', 'Evaluations') },
          ]}
        />
      ) : (
        <div className="px-4 flex items-end gap-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            <SegmentedTabs
              variant="underline"
              noBorder
              value={activeTab}
              onChange={(key) => { setActiveTab(key as typeof activeTab); }}
              items={[
                { key: 'tasks', icon: <CheckSquare size={14} />, label: t('courses.tabs.tasks', 'Tasks') },
                { key: 'notes', icon: <FileText size={14} />, label: t('courses.tabs.notes', 'Notes') },
                { key: 'materials', icon: <BookOpen size={14} />, label: t('courses.tabs.materials', 'Materials') },
                { key: 'evaluations', icon: <Star size={14} />, label: t('courses.tabs.evaluations', 'Evaluations') },
              ]}
            />
          </div>
          <div className="flex items-center gap-2 pb-2.5">
            {activeTab === 'tasks' && (
              <>
                {taskFilterGroups.length > 0 && (
                  <FilterControl groups={taskFilterGroups} onClear={() => setTaskFilterTags(new Set())} />
                )}
                <button
                  onClick={() => setTasksAddOpen(true)}
                  className="inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-colors"
                >
                  <Plus size={14} />
                </button>
              </>
            )}
            {activeTab === 'notes' && (
              <button
                onClick={() => setNotesAddOpen(true)}
                className="inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-colors"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tasks */}
      {!isTeacher && activeTab === 'tasks' && (
        <StudentTasksTab
          courseId={courseId as string}
          addOpen={tasksAddOpen}
          onAddOpenChange={setTasksAddOpen}
          filterTags={taskFilterTags}
        />
      )}

      {/* Notes */}
      {!isTeacher && activeTab === 'notes' && (
        <StudentNotesTab
          courseId={courseId as string}
          addOpen={notesAddOpen}
          onAddOpenChange={setNotesAddOpen}
        />
      )}

      {/* Materials (student view) */}
      {!isTeacher && activeTab === 'materials' && (
        <StudentMaterialsTab courseId={courseId as string} />
      )}

      {/* Evaluations */}
      {!isTeacher && activeTab === 'evaluations' && (
        <StudentEvaluationsTab courseId={courseId as string} />
      )}

      {/* Teacher: Assignments tab */}
      {isTeacher && teacherTab === 'assignments' && (
        <TeacherAssignmentsTab courseId={courseId as string} />
      )}

      {/* Teacher: Materials tab */}
      {isTeacher && teacherTab === 'materials' && (
        <TeacherMaterialsTab courseId={courseId as string} />
      )}

      {/* Teacher: Students tab */}
      {isTeacher && teacherTab === 'students' && (
        <TeacherStudentsTab courseId={courseId as string} />
      )}

      {/* Teacher: Evaluations tab */}
      {isTeacher && teacherTab === 'evaluations' && (
        <TeacherEvaluationsTab courseId={courseId as string} />
      )}

      <PublicProfileModal
        userId={viewingTeacherId}
        onClose={() => setViewingTeacherId(null)}
      />
    </div>
  );
}
