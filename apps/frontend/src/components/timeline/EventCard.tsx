import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Event, EventType } from '@/types';
import EditEventDialog from '@/components/timeline/EditEventDialog';

interface EventCardProps {
  event: Event;
  canEdit?: boolean;
  onDelete?: () => void;
  onEdit: (data: {
    title: string;
    startDate: string;
    endDate: string;
    description?: string | null;
    place?: string;
    type: EventType;
  }) => Promise<void>;
  compact?: boolean;
}

function formatDuration(startIso: string, endIso: string): string {
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  const totalMin = Math.round(diffMs / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function EventCard({
  event,
  canEdit = true,
  onDelete,
  onEdit,
  compact = false,
}: EventCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const isDeadline = event.type === 'DEADLINE';
  const startTime = formatTime(event.startDate);
  const duration = isDeadline ? null : formatDuration(event.startDate, event.endDate);

  return (
    <>
      <div className="flex items-stretch gap-2">
        {!compact && (
          <span className="text-[11px] font-semibold text-gray-400 w-16 pt-2 shrink-0 text-right">
            {startTime}
          </span>
        )}
        <div
          className={`w-1.5 rounded-full shrink-0 ${isDeadline ? 'bg-red-500' : 'bg-green-500'}`}
        />
        <Card
          className={`flex-1 min-w-0 border-gray-100 dark:border-gray-700 shadow-sm rounded-xl ${canEdit ? 'cursor-pointer' : ''}`}
          onClick={canEdit ? () => setEditOpen(true) : undefined}
        >
          <CardContent className={`flex items-center gap-2 ${compact ? 'p-3' : 'p-4'}`}>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                {event.title}
              </p>
              <p
                className={`text-gray-400 truncate ${compact ? 'text-xs mt-0.5' : 'text-[13px] mt-0.5'}`}
              >
                {startTime}
                {duration ? ` · ${duration}` : ''}
                {event.place ? ` · ${event.place}` : ''}
                {isDeadline && <span className="ml-1 text-red-400 font-medium">· deadline</span>}
              </p>
            </div>
            {canEdit && onDelete && !compact && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                aria-label="Delete event"
              >
                ×
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {canEdit && (
        <EditEventDialog
          event={event}
          isOpen={editOpen}
          onOpenChange={setEditOpen}
          onSave={onEdit}
        />
      )}
    </>
  );
}
