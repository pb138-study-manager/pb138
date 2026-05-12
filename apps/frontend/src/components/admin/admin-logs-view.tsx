import { useMemo, useState } from 'react';
import type { AdminAuditLogRow } from '@/components/admin/mock-data';
import { mockAuditLogs } from '@/components/admin/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AdminLogsView() {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockAuditLogs;
    return mockAuditLogs.filter(
      (r: AdminAuditLogRow) =>
        r.description.toLowerCase().includes(q) ||
        r.actor.toLowerCase().includes(q) ||
        r.at.includes(q)
    );
  }, [query]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>Read-only preview of security-relevant events.</CardDescription>
        </div>
        <div className="grid w-full gap-1.5 sm:w-64">
          <Label htmlFor="log-filter">Filter</Label>
          <Input
            id="log-filter"
            placeholder="Actor, action, date…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="pb-2 pr-4 font-medium">Time</th>
              <th className="pb-2 pr-4 font-medium">Actor</th>
              <th className="pb-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-4 align-top text-gray-600 whitespace-nowrap">{row.at}</td>
                <td className="py-2 pr-4 align-top font-medium text-gray-900">{row.actor}</td>
                <td className="py-2 align-top text-gray-700">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
