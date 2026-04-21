import { useState } from 'react';
import { Clock, Users } from 'lucide-react';
import { Task } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';

export default function TaskCard({ task }: { task: Task }) {
  const [isChecked, setIsChecked] = useState(task.status === 'DONE');
  const dueTime = `Due ${new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const subject = task.description || 'No description';
  const progress = task.status === 'DONE' ? 4 : task.status === 'IN PROGRESS' ? 2 : 1;
  const maxProgress = 4;
  const hasUsers = task.assignmentId !== null;
  const progressPercent = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2 flex items-start gap-3 hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 truncate">{task.title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          {hasUsers && <Users className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
          <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500 truncate">
            {dueTime} · {subject}
          </p>
        </div>
        {maxProgress > 0 && (
          <div className="mt-1.5">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-blue-500 font-medium mt-0.5 block">
              {progress}/{maxProgress}
            </span>
          </div>
        )}
      </div>
      <div className="flex mt-5 items-center">
        <Checkbox
          checked={isChecked}
          onCheckedChange={(checked) => setIsChecked(checked as boolean)}
          className={`flex-shrink-0 w-7 h-7 rounded-full transition-all cursor-pointer ${
            isChecked
              ? 'bg-green-500 border-green-500'
              : 'bg-white border-gray-300 hover:border-gray-400'
          }`}
        />
      </div>
    </div>
  );
}
