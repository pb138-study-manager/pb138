import { Plus } from 'lucide-react';

interface FreeTimeBlockProps {
  startTime: string;
  endTime: string;
  durationLabel: string;
  onAdd?: () => void;
}

export function FreeTimeBlock({ startTime, endTime, durationLabel, onAdd }: FreeTimeBlockProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col justify-between py-2">
        <span className="text-[10px] font-bold text-gray-300 w-12">{startTime}</span>
        <span className="text-[10px] font-bold text-gray-300 w-12">{endTime}</span>
      </div>
      <div className="flex-1">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-px bg-gray-300 relative mx-1">
              <div className="absolute -top-1 -left-[1.5px] w-1 h-1 rounded-full bg-gray-400" />
              <div className="absolute -bottom-1 -left-[1.5px] w-1 h-1 rounded-full bg-gray-400" />
            </div>
            <span className="text-xs font-bold text-gray-400">
              {durationLabel} <span className="font-normal ml-2">→ No plans</span>
            </span>
          </div>
          {onAdd && (
            <button onClick={onAdd} className="text-gray-300 hover:text-gray-500 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
