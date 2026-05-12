export default function TaskSidebar({
  counts,
}: {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: { today: number; backlog: number; done: number };
}) {
  return (
    <div className="w-32">
      <div className="mb-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Tasks{' '}
          <span className="text-2xl text-gray-400">
            {counts.today + counts.backlog + counts.done}
          </span>
        </h2>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex items-baseline gap-2 border-l-4 border-blue-600 pl-3">
            <span className="text-2xl font-bold text-blue-600">{counts.today}</span>
            <span className="text-gray-600 font-medium">today</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2 border-l-4 border-orange-500 pl-3">
            <span className="text-2xl font-bold text-orange-500">{counts.backlog}</span>
            <span className="text-gray-600 font-medium">Back log</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2 border-l-4 border-green-600 pl-3">
            <span className="text-2xl font-bold text-green-600">{counts.done}</span>
            <span className="text-gray-600 font-medium">done</span>
          </div>
        </div>
      </div>
    </div>
  );
}
