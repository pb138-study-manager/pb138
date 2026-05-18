import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTimelineManager } from '@/hooks/useTimelineManager'
import { EventCard } from '@/components/timeline/EventCard'
import { TaskTimelineCard } from '@/components/timeline/TaskTimelineCard'
import NewEventDialog from '@/components/timeline/NewEventDialog'

export const Route = createFileRoute('/timeline/')({
  component: TimelinePage,
})

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function TimelinePage() {
  const {
    selectedDate,
    weekStart,
    weekDates,
    events,
    eventsForSelectedDate,
    tasksForSelectedDate,
    isPending,
    selectDate,
    prevWeek,
    nextWeek,
    createEvent,
    deleteEvent,
    toggleTask,
    editTaskFull,
    editEvent,
  } = useTimelineManager()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const today = new Date()

  type TimelineItem =
    | { kind: 'event'; time: number; data: (typeof eventsForSelectedDate)[0] }
    | { kind: 'task'; time: number; data: (typeof tasksForSelectedDate)[0] }

  const timelineItems: TimelineItem[] = [
    ...eventsForSelectedDate.map((e) => ({ kind: 'event' as const, time: new Date(e.startDate).getTime(), data: e })),
    ...tasksForSelectedDate.map((t) => ({ kind: 'task' as const, time: new Date(t.dueDate!).getTime(), data: t })),
  ].sort((a, b) => a.time - b.time)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-24">
      {/* HEADER */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Timeline</h1>
          <p className="text-sm text-gray-400">{formatDayHeader(selectedDate)}</p>
        </div>

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

      <NewEventDialog
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSave={(data) => createEvent(data).then(() => {})}
      />

      {/* CALENDAR STRIP */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4 px-2">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-gray-50 dark:bg-gray-800 border-none" onClick={prevWeek}>
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </Button>
          <span className="font-bold text-sm dark:text-white">{formatMonthYear(weekStart)}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-gray-50 dark:bg-gray-800 border-none" onClick={nextWeek}>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Button>
        </div>

        <div className="flex justify-between gap-1">
          {weekDates.map((date, i) => {
            const isActive = date.toDateString() === selectedDate.toDateString()
            const isToday = date.toDateString() === today.toDateString()
            const dayEvents = events.filter((e) => e.startDate && new Date(e.startDate).toDateString() === date.toDateString())
            const hasEvent = dayEvents.some((e) => e.type === 'EVENT')
            const hasDeadline = dayEvents.some((e) => e.type === 'DEADLINE')
            return (
              <button key={i} onClick={() => selectDate(date)} className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-gray-400">{DAY_LABELS[i]}</span>
                <div className={`
                  w-10 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-colors
                  ${isActive ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white'}
                `}>
                  <span className="font-bold">{date.getDate()}</span>
                  {isToday && !isActive && !hasEvent && !hasDeadline && <div className="w-1 h-1 rounded-full bg-red-500" />}
                  {(hasEvent || hasDeadline) && !isActive && (
                    <div className="flex gap-0.5">
                      {hasEvent && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                      {hasDeadline && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* LEGEND */}
      <div className="px-4 flex gap-2 overflow-x-auto no-scrollbar mb-8">
        <LegendBadge color="bg-green-500" label="Event" />
        <LegendBadge color="bg-red-500" label="Deadline" />
        <LegendBadge color="bg-blue-500" label="Tasks" />
      </div>

      {/* TIMELINE CONTENT */}
      <div className="px-4 space-y-4">
        {isPending && (
          <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
        )}

        {!isPending && timelineItems.length === 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-sm text-gray-400">No events for this day</p>
            <p className="text-xs text-gray-300 mt-1">Tap + to add one</p>
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
              timeLabel={formatTime(item.data.dueDate ?? '')}
              onToggle={() => toggleTask(item.data.id)}
              onEditFull={editTaskFull}
            />
          )
        )}
      </div>
    </div>
  )
}

function LegendBadge({ color, label }: { color: string; label: string }) {
  return (
    <Badge variant="secondary" className="bg-gray-50 text-gray-500 border-none px-3 py-1 flex gap-2 items-center rounded-full whitespace-nowrap font-medium text-[10px]">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {label}
    </Badge>
  )
}
