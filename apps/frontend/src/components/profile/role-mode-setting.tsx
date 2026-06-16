import { GraduationCap } from 'lucide-react';
import { useRoleMode } from '@/lib/roleMode';

export default function RoleModeSetting() {
  const { mode, toggle } = useRoleMode();
  const isTeacher = mode === 'teacher';

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        <div>
          <span className="text-gray-600 dark:text-gray-300 font-medium">Teacher Mode</span>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {isTeacher ? 'Switched to teacher view' : 'Switch to teacher view'}
          </p>
        </div>
      </div>
      <button
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          isTeacher ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isTeacher ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
