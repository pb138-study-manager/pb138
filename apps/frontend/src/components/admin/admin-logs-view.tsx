import { useAdminManager } from '@/hooks/useAdminManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AdminLogsView() {
  const { adminLogs, logsLoading, logQuery, setLogQuery } = useAdminManager();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>Read-only record of security-relevant events.</CardDescription>
        </div>
        <div className="grid w-full gap-1.5 sm:w-64">
          <Label htmlFor="log-filter">Filter</Label>
          <Input
            id="log-filter"
            placeholder="Action description…"
            value={logQuery}
            onChange={(e) => setLogQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {logsLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-2 pr-4 font-medium">Time</th>
                <th className="pb-2 pr-4 font-medium">Actor</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {adminLogs.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-4 align-top text-gray-600 whitespace-nowrap">
                    {new Date(row.happenedAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 align-top font-medium text-gray-900">
                    {row.actorLogin ?? `#${row.actorId}`}
                  </td>
                  <td className="py-2 align-top text-gray-700">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
