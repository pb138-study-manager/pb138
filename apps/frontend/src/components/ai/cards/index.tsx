import { BookOpen, FileText } from 'lucide-react';

export type AgentDisplay = { type: 'tasks' | 'events' | 'notes' | 'courses'; items: unknown[] };

export function TaskCard({ item }: { item: Record<string, unknown> }) {
  const priorityDot: Record<string, string> = {
    HIGH: 'bg-red-500',
    MEDIUM: 'bg-amber-400',
    LOW: 'bg-indigo-400',
  };
  const priority = String(item.priority ?? 'LOW');
  const dueDate = item.dueDate ? new Date(String(item.dueDate)) : null;
  const overdue = dueDate && dueDate < new Date();

  return (
    <div className="flex items-center gap-2.5 bg-white dark:bg-gray-700 rounded-xl p-3 border border-gray-200 dark:border-gray-600">
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${priorityDot[priority] ?? 'bg-indigo-400'}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {String(item.title ?? '')}
        </p>
        {dueDate && (
          <p className={`text-xs ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
            {overdue ? 'Overdue · ' : ''}
            {dueDate.toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

export function EventCard({ item }: { item: Record<string, unknown> }) {
  const start = item.startDate ? new Date(String(item.startDate)) : null;
  const end = item.endDate ? new Date(String(item.endDate)) : null;
  const isDeadline = item.type === 'DEADLINE';
  const startTime = start
    ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  let duration: string | null = null;
  if (start && end && !isDeadline) {
    const diffMin = Math.round((end.getTime() - start.getTime()) / 60000);
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    duration = h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  return (
    <div className="flex items-stretch gap-2">
      <div
        className={`w-1.5 rounded-full shrink-0 ${isDeadline ? 'bg-red-500' : 'bg-green-500'}`}
      />
      <div className="flex-1 bg-white dark:bg-gray-700 rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-600 shadow-sm min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
          {String(item.title ?? '')}
        </p>
        {startTime && (
          <p className="text-xs text-gray-400 mt-0.5">
            {startTime}
            {duration ? ` · ${duration}` : ''}
            {isDeadline && <span className="text-red-400 font-medium"> · deadline</span>}
          </p>
        )}
      </div>
    </div>
  );
}

export function NoteCard({ item }: { item: Record<string, unknown> }) {
  return (
    <div className="flex items-center gap-2.5 bg-white dark:bg-gray-700 rounded-xl p-3 border border-gray-200 dark:border-gray-600">
      <FileText size={14} className="text-purple-400 shrink-0" />
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
        {String(item.title ?? '')}
      </p>
    </div>
  );
}

export function CourseCard({ item }: { item: Record<string, unknown> }) {
  return (
    <div className="flex items-center gap-2.5 bg-white dark:bg-gray-700 rounded-xl p-3 border border-gray-200 dark:border-gray-600">
      <BookOpen size={14} className="text-indigo-400 shrink-0" />
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
        {item.code ? `${item.code} — ` : ''}
        {String(item.name ?? '')}
      </p>
    </div>
  );
}

export function DisplayCards({ display }: { display: AgentDisplay }) {
  const items = display.items as Record<string, unknown>[];
  if (items.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {items.map((item, i) => {
        if (display.type === 'tasks') return <TaskCard key={i} item={item} />;
        if (display.type === 'events') return <EventCard key={i} item={item} />;
        if (display.type === 'notes') return <NoteCard key={i} item={item} />;
        return <CourseCard key={i} item={item} />;
      })}
    </div>
  );
}
