import { useMemo, useState } from 'react';
import { mockAdminUsers } from '@/components/admin/mock-data';
import type { AdminUserRow } from '@/components/admin/mock-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AdminUsersManager() {
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockAdminUsers;
    return mockAdminUsers.filter(
      (u: AdminUserRow) =>
        u.login.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roles.some((r) => r.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>List, search, and edit flows will call admin user endpoints later.</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
            <div className="grid min-w-[200px] flex-1 gap-1.5">
              <Label htmlFor="user-q">Search</Label>
              <Input
                id="user-q"
                placeholder="Login, email, role…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button type="button" className="sm:mb-0.5" onClick={() => setDialogOpen(true)}>
              Add user (mock)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-2 pr-4 font-medium">ID</th>
                <th className="pb-2 pr-4 font-medium">Login</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Roles</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-4 text-gray-600">{u.id}</td>
                  <td className="py-2 pr-4 font-medium text-gray-900">{u.login}</td>
                  <td className="py-2 pr-4 text-gray-700">{u.email}</td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="secondary">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2">
                    <Badge variant={u.active ? 'default' : 'outline'}>{u.active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>This dialog is UI-only; no request is sent.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="nu-login">Login</Label>
              <Input id="nu-login" placeholder="login" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nu-email">Email</Label>
              <Input id="nu-email" type="email" placeholder="email@school.cz" />
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => setDialogOpen(false)}>
              Save (mock)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
