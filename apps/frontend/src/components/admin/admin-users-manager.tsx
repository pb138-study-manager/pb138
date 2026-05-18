import { useState } from 'react';
import { useAdminManager } from '@/hooks/useAdminManager';
import type { AdminUser, RoleName } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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

const ALL_ROLES: RoleName[] = ['USER', 'TEACHER', 'ADMIN'];

export function AdminUsersManager() {
  const { adminUsers, usersLoading, userQuery, setUserQuery, assignRole, removeRole } =
    useAdminManager();
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [pendingRoles, setPendingRoles] = useState<RoleName[]>([]);
  const [saving, setSaving] = useState(false);

  function openRoleDialog(user: AdminUser) {
    setEditingUser(user);
    setPendingRoles([...user.roles]);
  }

  function toggleRole(role: RoleName) {
    setPendingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function saveRoles() {
    if (!editingUser) return;
    setSaving(true);
    const toAdd = pendingRoles.filter((r) => !editingUser.roles.includes(r));
    const toRemove = editingUser.roles.filter((r) => !pendingRoles.includes(r));
    for (const role of toAdd) await assignRole(editingUser.id, role);
    for (const role of toRemove) await removeRole(editingUser.id, role);
    setSaving(false);
    setEditingUser(null);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>Search users and manage their roles.</CardDescription>
          </div>
          <div className="grid min-w-[200px] gap-1.5">
            <Label htmlFor="user-q">Search</Label>
            <Input
              id="user-q"
              placeholder="Login, email…"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {usersLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-2 pr-4 font-medium">ID</th>
                  <th className="pb-2 pr-4 font-medium">Login</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Roles</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u) => (
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
                      <Button size="sm" variant="outline" onClick={() => openRoleDialog(u)}>
                        Edit roles
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit roles — {editingUser?.login}</DialogTitle>
            <DialogDescription>Check the roles this user should have.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            {ALL_ROLES.map((role) => (
              <div key={role} className="flex items-center gap-3">
                <Checkbox
                  id={`role-${role}`}
                  checked={pendingRoles.includes(role)}
                  onCheckedChange={() => toggleRole(role)}
                />
                <Label htmlFor={`role-${role}`} className="cursor-pointer font-normal">
                  {role}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={saveRoles} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
