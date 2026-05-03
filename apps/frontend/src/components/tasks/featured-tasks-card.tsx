import { Clock } from 'lucide-react';
import { FeaturedTaskItem } from '@/types';

export default function FeaturedTaskCard({ task }: { task: FeaturedTaskItem }) {
  const bgColor = task.color === 'yellow' ? 'bg-yellow-100' : 'bg-green-500';
  const borderColor = task.color === 'yellow' ? 'border-yellow-300' : 'border-green-600';
  const textColor = task.color === 'yellow' ? 'text-gray-900' : 'text-white';
  const timeColor = task.color === 'yellow' ? 'text-gray-600' : 'text-green-100';

  return (
    <div
      className={`${bgColor} border-l-4 ${borderColor} rounded-xl p-4 mb-3 flex items-start gap-3 shadow-sm`}
    >
      <div
        className={`w-1 rounded-full flex-shrink-0 ${task.color === 'yellow' ? 'bg-yellow-400' : 'bg-green-400'}`}
      />
      <div className="flex-1">
        <h3 className={`font-semibold text-sm ${textColor}`}>{task.title}</h3>
        <p className={`text-xs ${timeColor} mt-1 flex items-center gap-1`}>
          <Clock className="w-3 h-3" />
          {task.time}
        </p>
      </div>
    </div>
  );
}
