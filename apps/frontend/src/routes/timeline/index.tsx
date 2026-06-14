import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Copy, Check, RefreshCw } from 'lucide-react';
import { useTimelineManager } from '@/hooks/useTimelineManager';
import { EventCard } from '@/components/timeline/EventCard';
import { TaskTimelineCard } from '@/components/timeline/TaskTimelineCard';
import NewEventDialog from '@/components/timeline/NewEventDialog';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Event, Task } from '@/types';
import { getWeekStart, isSameDay, shiftDate } from '@/hooks/timeline-utils';
import { ViewTabs } from '@/components/ai/ViewTabs';
import { AiSummaryView } from '@/components/ai/AiSummaryView';

export const Route = createFileRoute('/timeline/')({
  component: TimelinePage,
});

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function formatTime(iso: string, lang: string): string {
  return new Date(iso).toLocaleTimeString(lang, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: lang !== 'cs-CZ',
  });
}

function formatMonthYear(date: Date, lang: string): string {
  return date.toLocaleDateString(lang, { month: 'short', year: 'numeric' });
}

function formatDayHeader(date: Date, lang: string): string {
  return date.toLocaleDateString(lang, { weekday: 'long', month: 'long', day: 'numeric' });
}

function get_month_grid(month_start: Date): Date[] {
  const grid_start = getWeekStart(month_start);
  const last_day = new Date(month_start.getFullYear(), month_start.getMonth() + 1, 0);
  const day_of_week = last_day.getDay();
  const days_to_sunday = day_of_week === 0 ? 0 : 7 - day_of_week;
  const total_days =
    Math.round((last_day.getTime() - grid_start.getTime()) / 86400000) + 1 + days_to_sunday;
  return Array.from({ length: total_days }, (_, i) => shiftDate(grid_start, i));
}

function TimelinePage() {
  const {
    selectedDate,
    weekStart,
    weekDates,
    events,
    tasksForSelectedDate,
    tasks,
    isPending,
    selectDate,
    prevWeek,
    nextWeek,
    createEvent,
    deleteEvent,
    toggleTask,
    editTaskFull,
    editEvent,
  } = useTimelineManager();

  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'cs' ? 'cs-CZ' : 'en-US';

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [page_view, set_page_view] = useState<'standard' | 'ai'>('standard');
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [calTokenLoading, setCalTokenLoading] = useState(false);

  async function handleOpenCalendarModal() {
    setCalTokenLoading(true);
    setCalendarModalOpen(true);
    try {
      const { token } = await api.get<{ token: string }>('/users/me/calendar-token');
      const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/^https?/, 'webcal');
      setCalendarUrl(`${base}/events/ical?token=${token}`);
    } finally {
      setCalTokenLoading(false);
    }
  }

  async function handleRegenerate() {
    setCalTokenLoading(true);
    try {
      const { token } = await api.post<{ token: string }>('/users/me/calendar-token', {});
      const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/^https?/, 'webcal');
      setCalendarUrl(`${base}/events/ical?token=${token}`);
    } finally {
      setCalTokenLoading(false);
    }
  }

  function handleCopy() {
    if (!calendarUrl) return;
    navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const [view_mode, set_view_mode] = useState<'week' | 'month'>('week');
  const [month_start, set_month_start] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const today = new Date();

  const month_end = new Date(
    month_start.getFullYear(),
    month_start.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const { data: month_events = [], isPending: month_events_pending } = useQuery({
    queryKey: ['events', 'month', month_start.toISOString()],
    queryFn: () =>
      api
        .get<Event[]>(`/events?from=${month_start.toISOString()}&to=${month_end.toISOString()}`)
        .catch(() => []),
    enabled: view_mode === 'month',
  });

  function prev_month() {
    set_month_start((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function next_month() {
    set_month_start((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  const active_events_for_selected_date = (view_mode === 'month' ? month_events : events).filter(
    (e) => isSameDay(new Date(e.startDate), selectedDate)
  );

  const is_loading = view_mode === 'month' ? month_events_pending : isPending;

  type TimelineItem =
    | { kind: 'event'; time: number; data: (typeof active_events_for_selected_date)[0] }
    | { kind: 'task'; time: number; data: (typeof tasksForSelectedDate)[0] };

  const timelineItems: TimelineItem[] = [
    ...active_events_for_selected_date.map((e) => ({
      kind: 'event' as const,
      time: new Date(e.startDate).getTime(),
      data: e,
    })),
    ...tasksForSelectedDate.map((t) => ({
      kind: 'task' as const,
      time: new Date(t.dueDate!).getTime(),
      data: t,
    })),
  ].sort((a, b) => a.time - b.time);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-24">
      {/* View tabs */}
      <div className="px-4 pt-6">
        <ViewTabs
          tabs={[
            { value: 'standard', label: t('nav.timeline', 'Timeline') },
            { value: 'ai', label: t('ai.aiSummary') },
          ]}
          value={page_view}
          onChange={(v) => set_page_view(v as 'standard' | 'ai')}
        />
      </div>

      {/* AI summary (kept mounted to cache result across tab switches) */}
      <div className={page_view === 'ai' ? '' : 'hidden'}>
        <AiSummaryView endpoint="/ai/timeline_summary" active={page_view === 'ai'} />
      </div>

      {/* Calendar subscription modal */}
      {calendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {t('timeline.addToCalendar', 'Add to Calendar')}
                </h2>
              </div>
              <button onClick={() => setCalendarModalOpen(false)}>
                <span className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</span>
              </button>
            </div>
            <p className="text-xs text-gray-400">
              {t('timeline.calendarSubscribeHint', 'Copy this URL and paste it into Google Calendar → "Add by URL", or open it in Apple Calendar / Outlook to subscribe.')}
            </p>
            {calTokenLoading ? (
              <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ) : (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
                <span className="flex-1 text-xs text-gray-600 dark:text-gray-300 truncate font-mono">
                  {calendarUrl}
                </span>
                <button onClick={handleCopy} className="shrink-0 text-gray-400 hover:text-indigo-500 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
            <button
              onClick={handleRegenerate}
              disabled={calTokenLoading}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
              {t('timeline.calendarRegenerate', 'Regenerate (revokes old URL)')}
            </button>
          </div>
        </div>
      )}

      {page_view === 'standard' && (
        <>
      {/* HEADER */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('nav.timeline', 'Timeline')}
          </h1>
          <p className="text-sm text-gray-400">{formatDayHeader(selectedDate, lang)}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => set_view_mode('week')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                view_mode === 'week'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {t('timeline.week', 'Week')}
            </button>
            <button
              type="button"
              onClick={() => set_view_mode('month')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                view_mode === 'month'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {t('timeline.month', 'Month')}
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            type="button"
            onClick={handleOpenCalendarModal}
            title={t('timeline.addToCalendar', 'Add to Calendar')}
          >
            <CalendarDays className="w-5 h-5 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            type="button"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>

      <NewEventDialog
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSave={(data) => createEvent(data).then(() => {})}
      />

      {/* CALENDAR STRIP / MONTH GRID */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4 px-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-gray-50 dark:bg-gray-800 border-none"
            onClick={view_mode === 'month' ? prev_month : prevWeek}
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </Button>
          <span className="font-bold text-sm dark:text-white">
            {formatMonthYear(view_mode === 'month' ? month_start : weekStart, lang)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-gray-50 dark:bg-gray-800 border-none"
            onClick={view_mode === 'month' ? next_month : nextWeek}
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Button>
        </div>

        {view_mode === 'week' ? (
          <div className="flex justify-between gap-1">
            {weekDates.map((date, i) => {
              const isActive = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === today.toDateString();
              const dayEvents = events.filter(
                (e) => e.startDate && new Date(e.startDate).toDateString() === date.toDateString()
              );
              const hasEvent = dayEvents.some((e) => e.type === 'EVENT');
              const hasDeadline = dayEvents.some((e) => e.type === 'DEADLINE');
              return (
                <button
                  key={i}
                  onClick={() => selectDate(date)}
                  className="flex flex-col items-center gap-2"
                >
                  <span className="text-xs font-semibold text-gray-400">
                    {t(`timeline.days.${DAY_KEYS[i]}`, DAY_LABELS[i])}
                  </span>
                  <div
                    className={`
                    w-10 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-colors
                    ${isActive ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200' : isToday ? 'bg-gray-100 dark:bg-gray-700 border-red-400 text-gray-900 dark:text-white' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white'}
                  `}
                  >
                    <span className="font-bold">{date.getDate()}</span>
                    {(hasEvent || hasDeadline) && !isActive && (
                      <div className="flex gap-0.5">
                        {hasEvent && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                        {hasDeadline && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <MonthGrid
            month_start={month_start}
            active_events={month_events}
            tasks={tasks}
            selected_date={selectedDate}
            on_select_date={selectDate}
            today={today}
          />
        )}
      </div>

      {/* LEGEND */}
      <div className="px-4 flex gap-2 overflow-x-auto no-scrollbar mb-8">
        <LegendBadge color="bg-green-500" label={t('timeline.event', 'Event')} />
        <LegendBadge color="bg-red-500" label={t('timeline.deadline', 'Deadline')} />
        <LegendBadge color="bg-blue-500" label={t('timeline.tasks', 'Tasks')} />
      </div>

      {/* TIMELINE CONTENT */}
      <div className="px-4 space-y-4">
        {is_loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        )}

        {!is_loading && timelineItems.length === 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-sm text-gray-400">
              {t('timeline.noEvents', 'No events for this day')}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              {t('timeline.tapToAdd', 'Tap + to add one')}
            </p>
          </div>
        )}

        {timelineItems.map((item) =>
          item.kind === 'event' ? (
            <EventCard
              key={`event-${item.data.id}`}
              event={item.data}
              onDelete={() => deleteEvent(item.data.id)}
              onEdit={(data) => editEvent(item.data.id, data)}
            />
          ) : (
            <TaskTimelineCard
              key={`task-${item.data.id}`}
              task={item.data}
              timeLabel={formatTime(item.data.dueDate ?? '', lang)}
              onToggle={() => toggleTask(item.data.id)}
              onEditFull={editTaskFull}
            />
          )
        )}
      </div>
        </>
      )}
    </div>
  );
}

function MonthGrid({
  month_start,
  active_events,
  tasks,
  selected_date,
  on_select_date,
  today,
}: {
  month_start: Date;
  active_events: Event[];
  tasks: Task[];
  selected_date: Date;
  on_select_date: (date: Date) => void;
  today: Date;
}) {
  const { t } = useTranslation();
  const grid_dates = get_month_grid(month_start);
  const weeks: Date[][] = [];
  for (let i = 0; i < grid_dates.length; i += 7) {
    weeks.push(grid_dates.slice(i, i + 7));
  }
  const current_month = month_start.getMonth();

  return (
    <div>
      {/* Column headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-xs font-semibold text-gray-400 pb-2">
            {t(`timeline.days.${DAY_KEYS[i]}`, label)}
          </div>
        ))}
      </div>
      {/* Week rows */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((date, di) => {
            const in_month = date.getMonth() === current_month;
            const is_active = isSameDay(date, selected_date);
            const is_today = isSameDay(date, today);
            const day_events = active_events.filter((e) =>
              isSameDay(new Date(e.startDate), date)
            );
            const has_event = day_events.some((e) => e.type === 'EVENT');
            const has_deadline = day_events.some((e) => e.type === 'DEADLINE');
            const has_task = tasks.some(
              (tk) => tk.dueDate && isSameDay(new Date(tk.dueDate), date)
            );

            return (
              <button
                key={di}
                type="button"
                onClick={() => on_select_date(date)}
                className={`flex flex-col items-center py-1 ${!in_month ? 'opacity-30' : ''}`}
              >
                <span
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-colors
                    ${is_active ? 'bg-red-500 text-white' : is_today ? 'border border-red-400 text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}
                >
                  {date.getDate()}
                </span>
                <div className="flex gap-0.5 h-2 items-center mt-0.5">
                  {has_event && !is_active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                  {has_deadline && !is_active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}
                  {has_task && !is_active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function LegendBadge({ color, label }: { color: string; label: string }) {
  return (
    <Badge
      variant="secondary"
      className="bg-gray-50 text-gray-500 border-none px-3 py-1 flex gap-2 items-center rounded-full whitespace-nowrap font-medium text-[10px]"
    >
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {label}
    </Badge>
  );
}
