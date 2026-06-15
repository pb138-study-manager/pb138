import { useAdminManager } from '@/hooks/useAdminManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
  } = useAdminManager();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>Read-only record of security-relevant events.</CardDescription>
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
                <tr className="border-b border-gray-200 text-gray-500">
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
                  adminLogs.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4 align-top text-gray-600 whitespace-nowrap">
                        {new Date(row.happenedAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 align-top font-medium text-gray-900">
                        {row.actorLogin ?? `#${row.actorId}`}
                      </td>
                      <td className="py-2 align-top text-gray-700">{row.description}</td>
                    </tr>
                  ))
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
