import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import TaskSection from '@/components/tasks/tasks-section';
import { useTranslation } from 'react-i18next';
import { useTasksManager } from '@/hooks/useTasksManager';
import { filterTasks } from '@/lib/task-utils';
import { SegmentedTabs, type TabItem } from '@/components/ui/segmented-tabs';
import { FilterControl, type FilterGroup } from '@/components/shared/FilterControl';
import { Button } from '@/components/ui/button';
import NewTaskDialog from '@/components/tasks/new-tasks-dialog';

export const Route = createFileRoute('/tasks/')({
  component: TasksPage,
});

type Tab = 'overdue' | 'today' | 'thisWeek' | 'later' | 'done';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export function TasksPage() {
  const { t } = useTranslation();
  const {
    isPending,
    overdue,
    today,
    thisWeek,
    later,
    done,
    handleCreate,
    handleToggle,
    handleEditFull,
    handleDelete,
  } = useTasksManager();

  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [activePriorities, setActivePriorities] = useState<Set<Priority>>(new Set());
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  function togglePriority(p: string) {
    setActivePriorities((prev) => {
      const next = new Set(prev);
      const priority = p as Priority;
      next.has(priority) ? next.delete(priority) : next.add(priority);
      return next;
    });
  }

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  const allTasks = [...overdue, ...today, ...thisWeek, ...later, ...done];
  const allTags = Array.from(new Set(allTasks.flatMap((t) => t.tags ?? []))).sort();

  const filteredOverdue = filterTasks(overdue, activePriorities, activeTags);
  const filteredToday = filterTasks(today, activePriorities, activeTags);
  const filteredThisWeek = filterTasks(thisWeek, activePriorities, activeTags);
  const filteredLater = filterTasks(later, activePriorities, activeTags);
  const filteredDone = filterTasks(done, activePriorities, activeTags);

  const tabItems: TabItem[] = [
    ...(overdue.length > 0
      ? [{ key: 'overdue', label: t('tasks.overdue'), count: filteredOverdue.length }]
      : []),
    { key: 'today', label: t('tasks.today'), count: filteredToday.length },
    { key: 'thisWeek', label: t('tasks.thisWeek'), count: filteredThisWeek.length },
    { key: 'later', label: t('tasks.later'), count: filteredLater.length },
    { key: 'done', label: t('tasks.done'), count: filteredDone.length },
  ];

  const filterGroups: FilterGroup[] = [
    {
      type: 'priority',
      label: 'Priority',
      options: [
        { key: 'LOW', label: t('tasks.priorityLow'), color: '#22c55e' },
        { key: 'MEDIUM', label: t('tasks.priorityMedium'), color: '#f59e0b' },
        { key: 'HIGH', label: t('tasks.priorityHigh'), color: '#ef4444' },
      ],
      active: activePriorities as Set<string>,
      onToggle: togglePriority,
    },
    ...(allTags.length > 0
      ? [
          {
            type: 'tags' as const,
            label: 'Tags',
            options: allTags.map((tag) => ({ key: tag, label: tag })),
            active: activeTags,
            onToggle: toggleTag,
          },
        ]
      : []),
  ];

  const activeTaskMap: Record<Tab, ReturnType<typeof filterTasks>> = {
    overdue: filteredOverdue,
    today: filteredToday,
    thisWeek: filteredThisWeek,
    later: filteredLater,
    done: filteredDone,
  };

  const variantMap: Record<Tab, 'overdue' | 'default' | 'thisWeek' | 'later' | 'done'> = {
    overdue: 'overdue',
    today: 'default',
    thisWeek: 'thisWeek',
    later: 'later',
    done: 'done',
  };

  const resolvedTab: Tab =
    activeTab === 'overdue' && overdue.length === 0 ? 'today' : activeTab;

  if (isPending) {
    return (
      <div className="flex-1 w-full bg-gray-50 dark:bg-gray-900 px-4 py-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors">
            {t('tasks.title')}
          </h2>
          <div className="flex items-center gap-2">
            <FilterControl
              groups={filterGroups}
              onClear={() => {
                setActivePriorities(new Set());
                setActiveTags(new Set());
              }}
            />
            <Button
              size="sm"
              className="flex items-center gap-1.5"
              onClick={() => setNewTaskOpen(true)}
            >
              <Plus className="w-4 h-4" />
              {t('tasks.newTask', 'New task')}
            </Button>
          </div>
        </div>

        <SegmentedTabs
          items={tabItems}
          value={resolvedTab}
          onChange={(key) => setActiveTab(key as Tab)}
          variant="underline"
          className="mb-6"
        />

        <TaskSection
          title={tabItems.find((i) => i.key === resolvedTab)?.label ?? ''}
          count={activeTaskMap[resolvedTab].length}
          tasks={activeTaskMap[resolvedTab]}
          variant={variantMap[resolvedTab]}
          onTaskCreated={handleCreate}
          onToggle={handleToggle}
          onEditFull={handleEditFull}
          onDelete={handleDelete}
        />
      </div>

      <NewTaskDialog
        isOpen={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}
