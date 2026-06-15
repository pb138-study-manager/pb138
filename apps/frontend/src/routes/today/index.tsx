import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Sparkles, CheckSquare, CalendarDays, Plus, Clock } from 'lucide-react';
import TaskSection from '@/components/tasks/tasks-section';
import { FilterControl, FilterGroup } from '@/components/shared/FilterControl';
import { useTranslation } from 'react-i18next';
import { useTodayManager } from '@/hooks/useTodayManager';
import { SegmentedTabs, type TabItem } from '@/components/ui/segmented-tabs';
import { AiSummaryView } from '@/components/ai/AiSummaryView';
import { api } from '@/lib/api';
import NewTaskDialog from '@/components/tasks/new-tasks-dialog';

export const Route = createFileRoute('/today/')({
  component: TodayPage,
});

type Tab = 'ai' | 'tasks' | 'events';

function TodayPage() {
  const { t } = useTranslation();
  const {
    isPending,
    doneTasks,
    counts,
    handleCreate,
    handleToggle,
    handleEditFull,
    handleDelete,
    activePriorities,
    activeTags,
    togglePriority,
    toggleTag,
    clearFilters,
    allTasks,
    filteredToday,
    filteredBacklog,
    greeting,
    todayTotal,
    progressPct,
    visibleEvents,
  } = useTodayManager();

  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [displayName, setDisplayName] = useState<string>('');
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  useEffect(() => {
    api
      .get<{ login: string; profile: { name: string | null } }>('/users/me')
      .then((result) => {
        setDisplayName(result.profile.name ?? result.login);
      })
      .catch(() => {});
  }, []);

  const allUniqueTags = Array.from(new Set(allTasks.flatMap((task) => task.tags ?? []))).sort();

  const filterGroups: FilterGroup[] = [
    {
      type: 'priority',
      label: t('tasks.priority'),
      options: [
        { key: 'LOW', label: t('tasks.priorityLow'), color: '#22c55e' },
        { key: 'MEDIUM', label: t('tasks.priorityMedium'), color: '#f59e0b' },
        { key: 'HIGH', label: t('tasks.priorityHigh'), color: '#ef4444' },
      ],
      active: activePriorities as Set<string>,
      onToggle: (key) => togglePriority(key as 'LOW' | 'MEDIUM' | 'HIGH'),
    },
    ...(allUniqueTags.length > 0
      ? [
          {
            type: 'tags' as FilterGroup['type'],
            label: t('tasks.tags'),
            options: allUniqueTags.map((tag) => ({ key: tag, label: tag })),
            active: activeTags,
            onToggle: toggleTag,
          },
        ]
      : []),
  ];

  const tabItems: TabItem[] = [
    { key: 'ai', icon: <Sparkles size={14} />, label: t('ai.aiSummary') },
    { key: 'tasks', icon: <CheckSquare size={14} />, label: t('tasks.title'), count: filteredToday.length + filteredBacklog.length },
    { key: 'events', icon: <CalendarDays size={14} />, label: t('nav.timeline'), count: visibleEvents.length },
  ];

  if (isPending) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 px-4 py-6 space-y-4">
        <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-32 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20 overflow-y-auto">
      {/* Greeting + progress */}
      <div className="px-4 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
          {greeting}{displayName ? `, ${displayName}` : ''} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {t('today.progress', { done: counts.doneToday, total: todayTotal })}
        </p>
        <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <SegmentedTabs
          items={tabItems}
          value={activeTab}
          onChange={(k) => setActiveTab(k as Tab)}
          variant="underline"
        />
      </div>

      {/* AI Summary — kept mounted to cache the result */}
      <div className={activeTab === 'ai' ? '' : 'hidden'}>
        <AiSummaryView active={activeTab === 'ai'} />
      </div>

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <FilterControl groups={filterGroups} onClear={clearFilters} />
            <button
              onClick={() => setNewTaskOpen(true)}
              className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
            >
              <Plus size={16} className="text-white dark:text-gray-900" />
            </button>
          </div>

          <TaskSection
            title={t('tasks.today')}
            count={filteredToday.length}
            tasks={filteredToday}
            variant="default"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onEditFull={handleEditFull}
            onDelete={handleDelete}
          />
          <TaskSection
            title={t('tasks.backlog')}
            count={filteredBacklog.length}
            tasks={filteredBacklog}
            variant="backlog"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onEditFull={handleEditFull}
            onDelete={handleDelete}
          />
          <TaskSection
            title={t('tasks.done')}
            count={counts.done}
            tasks={doneTasks}
            variant="done"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onEditFull={handleEditFull}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* Events tab */}
      {activeTab === 'events' && (
        <div className="px-4 py-4 space-y-3">
          {visibleEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <CalendarDays size={36} className="opacity-40" />
              <p className="text-sm">No upcoming events today</p>
            </div>
          ) : (
            visibleEvents.map((event) => (
              <div key={event.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl shrink-0">
                    {event.type === 'DEADLINE' ? '⏰' : '📅'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{event.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                      <Clock size={12} />
                      <span>
                        {new Date(event.startDate).toLocaleTimeString(navigator.language ?? 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {event.endDate && ` – ${new Date(event.endDate).toLocaleTimeString(navigator.language ?? 'en-US', { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                      {event.place && <span>· 📍 {event.place}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <NewTaskDialog
        isOpen={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}
