import { useAdminManager } from '@/hooks/useAdminManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const LOG_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'admin', label: 'Admin actions' },
  { value: 'user', label: 'User activity' },
] as const;

export function AdminLogsView() {
  const {
    adminLogs,
    logsLoading,
    logsLoadingMore,
    hasMoreLogs,
    loadMoreLogs,
    logQuery,
    setLogQuery,
    logActor,
    setLogActor,
    logDateFrom,
    setLogDateFrom,
    logDateTo,
    setLogDateTo,
    logType,
    setLogType,
  } = useAdminManager();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>Read-only record of security-relevant events.</CardDescription>
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-white/[0.06] p-1 w-fit">
          {LOG_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setLogType(value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                logType === value
                  ? 'bg-white dark:bg-white/[0.12] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor="log-from">From</Label>
            <Input
              id="log-from"
              type="datetime-local"
              value={logDateFrom}
              onChange={(e) => setLogDateFrom(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="log-to">To</Label>
            <Input
              id="log-to"
              type="datetime-local"
              value={logDateTo}
              onChange={(e) => setLogDateTo(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="log-actor">Actor</Label>
            <Input
              id="log-actor"
              placeholder="Filter by login…"
              value={logActor}
              onChange={(e) => setLogActor(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="log-filter">Description</Label>
            <Input
              id="log-filter"
              placeholder="Filter by action…"
              value={logQuery}
              onChange={(e) => setLogQuery(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {logsLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                  <th className="pb-2 pr-4 font-medium">Time</th>
                  <th className="pb-2 pr-4 font-medium">Actor</th>
                  <th className="pb-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {adminLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-sm text-gray-400">
                      No logs match the current filters.
                    </td>
                  </tr>
                ) : (
                  adminLogs.map((row) => {
                    const isAdminAction = row.description.startsWith('Admin ');
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <td className="py-2 pr-4 align-top text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {new Date(row.happenedAt).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 align-top font-medium text-gray-900 dark:text-white">
                          {row.actorLogin ?? `#${row.actorId}`}
                        </td>
                        <td className="py-2 align-top text-gray-700 dark:text-gray-300">
                          <span className="flex items-center gap-2 flex-wrap">
                            {row.description}
                            {isAdminAction && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                                admin
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {hasMoreLogs && adminLogs.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={loadMoreLogs} disabled={logsLoadingMore}>
                  {logsLoadingMore ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
