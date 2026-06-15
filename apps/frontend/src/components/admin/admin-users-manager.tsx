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

type DeactivateDialogState =
  | { type: 'none' }
  | { type: 'confirm'; user: AdminUser }
  | { type: 'phrase'; user: AdminUser }
  | { type: 'last-admin'; user: AdminUser };

export function AdminUsersManager() {
  const {
    adminUsers,
    usersLoading,
    userQuery,
    setUserQuery,
    assignRole,
    removeRole,
    deactivateUser,
    reactivateUser,
  } = useAdminManager();

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [pendingRoles, setPendingRoles] = useState<RoleName[]>([]);
  const [saving, setSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [deactivateDialog, setDeactivateDialog] = useState<DeactivateDialogState>({ type: 'none' });
  const [deactivatePhrase, setDeactivatePhrase] = useState('');
  const [actioning, setActioning] = useState(false);

  function openRoleDialog(user: AdminUser) {
    setEditingUser(user);
    setPendingRoles([...user.roles]);
    setRoleError(null);
  }

  function toggleRole(role: RoleName) {
    setPendingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function saveRoles() {
    if (!editingUser) return;
    setSaving(true);
    setRoleError(null);
    try {
      const toAdd = pendingRoles.filter((r) => !editingUser.roles.includes(r));
      const toRemove = editingUser.roles.filter((r) => !pendingRoles.includes(r));
      for (const role of toAdd) await assignRole(editingUser.id, role);
      for (const role of toRemove) await removeRole(editingUser.id, role);
      setEditingUser(null);
    } catch (err: unknown) {
      const e = err as { error?: string; message?: string };
      if (e?.error === 'LAST_ADMIN') {
        setRoleError('There must always be at least one admin. Assign another admin first.');
      } else {
        setRoleError(e?.message ?? 'Failed to update roles.');
      }
    } finally {
      setSaving(false);
    }
  }

  function openDeactivateDialog(user: AdminUser) {
    const isAdmin = user.roles.includes('ADMIN');
    if (!isAdmin) {
      setDeactivateDialog({ type: 'confirm', user });
      return;
    }
    const adminCount = adminUsers.filter((u) => u.roles.includes('ADMIN') && !u.deletedAt).length;
    if (adminCount <= 1) {
      setDeactivateDialog({ type: 'last-admin', user });
    } else {
      setDeactivatePhrase('');
      setDeactivateDialog({ type: 'phrase', user });
    }
  }

  function closeDeactivateDialog() {
    setDeactivateDialog({ type: 'none' });
    setDeactivatePhrase('');
  }

  async function confirmDeactivate() {
    if (deactivateDialog.type === 'none' || deactivateDialog.type === 'last-admin') return;
    setActioning(true);
    try {
      await deactivateUser(deactivateDialog.user.id);
      closeDeactivateDialog();
    } catch (err: unknown) {
      const e = err as { error?: string; message?: string };
      if (e?.error === 'LAST_ADMIN') {
        setDeactivateDialog({ type: 'last-admin', user: deactivateDialog.user });
      }
    } finally {
      setActioning(false);
    }
  }

  async function handleReactivate(user: AdminUser) {
    setActioning(true);
    try {
      await reactivateUser(user.id);
    } finally {
      setActioning(false);
    }
  }

  const expectedPhrase =
    deactivateDialog.type === 'phrase' ? `DEACTIVATE ${deactivateDialog.user.login}` : '';

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
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u) => {
                  const isDeactivated = !!u.deletedAt;
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-gray-100 last:border-0 ${isDeactivated ? 'opacity-50' : ''}`}
                    >
                      <td className="py-2 pr-4 text-gray-600">{u.id}</td>
                      <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{u.login}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{u.email}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <Badge key={r} variant="secondary">{r}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        {isDeactivated ? (
                          <Badge variant="outline" className="text-gray-400 border-gray-300">Deactivated</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-300">Active</Badge>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          {isDeactivated ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                              onClick={() => handleReactivate(u)}
                              disabled={actioning}
                            >
                              Reactivate
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => openRoleDialog(u)}>
                                Edit roles
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950"
                                onClick={() => openDeactivateDialog(u)}
                              >
                                Deactivate
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Edit roles dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
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
                <Label htmlFor={`role-${role}`} className="cursor-pointer font-normal">{role}</Label>
              </div>
            ))}
            {roleError && <p className="text-sm text-red-500">{roleError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={saveRoles} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simple confirm deactivate dialog (non-admin users) */}
      <Dialog open={deactivateDialog.type === 'confirm'} onOpenChange={(open) => { if (!open) closeDeactivateDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate user</DialogTitle>
            <DialogDescription>
              Do you really want to deactivate{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {deactivateDialog.type === 'confirm' ? deactivateDialog.user.login : ''}
              </span>
              ? The account will be suspended but all data will be preserved. You can reactivate it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeactivateDialog}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivate}
              disabled={actioning}
            >
              {actioning ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security phrase dialog (admin user, not last) */}
      <Dialog open={deactivateDialog.type === 'phrase'} onOpenChange={(open) => { if (!open) closeDeactivateDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate admin account</DialogTitle>
            <DialogDescription>
              You are about to deactivate an admin account. To confirm, type the phrase below exactly:
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <code className="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-white select-all">
              {expectedPhrase}
            </code>
            <Input
              placeholder="Type the phrase above…"
              value={deactivatePhrase}
              onChange={(e) => setDeactivatePhrase(e.target.value)}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeactivateDialog}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivate}
              disabled={actioning || deactivatePhrase !== expectedPhrase}
            >
              {actioning ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Last admin — cannot deactivate */}
      <Dialog open={deactivateDialog.type === 'last-admin'} onOpenChange={(open) => { if (!open) closeDeactivateDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cannot deactivate this user</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-gray-900 dark:text-white">
                {deactivateDialog.type === 'last-admin' ? deactivateDialog.user.login : ''}
              </span>{' '}
              is the only admin. Assign another user the ADMIN role before deactivating this account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeactivateDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
