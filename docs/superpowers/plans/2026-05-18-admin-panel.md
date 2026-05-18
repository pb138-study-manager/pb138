# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing admin panel UI shell to real backend APIs — users list with role management, audit logs, and roles display. Remove all mock data.

**Architecture:** New `admin.ts` ElysiaJS route file behind ADMIN role guard. Frontend replaces mock data with a `useAdminManager` hook (TanStack Query) that each component calls directly. Route page files stay as thin wrappers — no props drilling.

**Tech Stack:** ElysiaJS + Drizzle ORM + Zod (backend); React + TanStack Query + `api` helper (frontend).

---

## File Map

| Action | File |
|--------|------|
| Create | `apps/backend/src/routes/admin.ts` |
| Modify | `apps/backend/src/index.ts` |
| Modify | `apps/frontend/src/types/index.ts` |
| Create | `apps/frontend/src/hooks/useAdminManager.ts` |
| Modify | `apps/frontend/src/components/admin/admin-users-manager.tsx` |
| Modify | `apps/frontend/src/components/admin/admin-logs-view.tsx` |
| Modify | `apps/frontend/src/components/admin/admin-roles-manager.tsx` |
| Modify | `apps/frontend/src/routes/admin/index.tsx` |

---

### Task 1: Backend — admin routes

**Files:**
- Create: `apps/backend/src/routes/admin.ts`

- [ ] **Step 1: Create `apps/backend/src/routes/admin.ts` with the full content below**

```typescript
import { Elysia } from 'elysia';
import { z } from 'zod';
import { db } from '../db';
import {
  users,
  userProfiles,
  roles,
  userRoles,
  permissions,
  rolePermissions,
  auditLogs,
} from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, ilike, inArray, desc, or } from 'drizzle-orm';
import { zodBody } from '../lib/validation';

const PatchRolesSchema = z.object({
  add: z.array(z.enum(['USER', 'ADMIN', 'TEACHER'])).optional(),
  remove: z.array(z.enum(['USER', 'ADMIN', 'TEACHER'])).optional(),
});

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
    if (!(user as AuthUser).roles.includes('ADMIN')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Admin access required' };
    }
  })

  // GET /admin/users?q=&limit=50&offset=0
  .get('/users', async ({ query }) => {
    const q = (query.q as string | undefined)?.trim() ?? '';
    const limit = Math.min(Number(query.limit ?? 50), 200);
    const offset = Number(query.offset ?? 0);

    const baseQuery = db
      .select({
        id: users.id,
        login: users.login,
        email: users.email,
        name: userProfiles.name,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId));

    const allUsers = await (q
      ? baseQuery.where(or(ilike(users.login, `%${q}%`), ilike(users.email, `%${q}%`)))
      : baseQuery
    )
      .limit(limit)
      .offset(offset);

    if (allUsers.length === 0) return [];

    const userIds = allUsers.map((u) => u.id);
    const allUserRoles = await db
      .select({ userId: userRoles.userId, roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(inArray(userRoles.userId, userIds));

    const rolesByUserId = new Map<number, string[]>();
    for (const { userId, roleName } of allUserRoles) {
      const existing = rolesByUserId.get(userId) ?? [];
      existing.push(roleName);
      rolesByUserId.set(userId, existing);
    }

    return allUsers.map((u) => ({
      ...u,
      deletedAt: u.deletedAt?.toISOString() ?? null,
      roles: rolesByUserId.get(u.id) ?? [],
    }));
  })

  // PATCH /admin/users/:id/roles
  .patch(
    '/users/:id/roles',
    async ({ params, body, user, set }) => {
      const targetId = Number(params.id);
      const authUser = user as AuthUser;

      const [target] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, targetId), isNull(users.deletedAt)));
      if (!target) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'User not found' };
      }

      const allRoles = await db.select().from(roles);
      const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r.id]));

      for (const roleName of body.add ?? []) {
        const roleId = roleMap[roleName];
        if (roleId) {
          await db.insert(userRoles).values({ userId: targetId, roleId }).onConflictDoNothing();
        }
      }

      for (const roleName of body.remove ?? []) {
        const roleId = roleMap[roleName];
        if (roleId) {
          await db
            .delete(userRoles)
            .where(and(eq(userRoles.userId, targetId), eq(userRoles.roleId, roleId)));
        }
      }

      await logAction(db, authUser.id, `Admin updated roles for user ${targetId}`);

      const updatedRoles = await db
        .select({ roleName: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, targetId));

      return { userId: targetId, roles: updatedRoles.map((r) => r.roleName) };
    },
    zodBody(PatchRolesSchema)
  )

  // GET /admin/audit-logs?q=&limit=50&offset=0
  .get('/audit-logs', async ({ query }) => {
    const q = (query.q as string | undefined)?.trim() ?? '';
    const limit = Math.min(Number(query.limit ?? 50), 200);
    const offset = Number(query.offset ?? 0);

    const baseQuery = db
      .select({
        id: auditLogs.id,
        actorId: auditLogs.actorId,
        actorLogin: users.login,
        description: auditLogs.description,
        happenedAt: auditLogs.happenedAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .orderBy(desc(auditLogs.happenedAt));

    const rows = await (q
      ? baseQuery.where(ilike(auditLogs.description, `%${q}%`))
      : baseQuery
    )
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      ...r,
      happenedAt: r.happenedAt.toISOString(),
    }));
  })

  // GET /admin/roles
  .get('/roles', async () => {
    const allRoles = await db.select().from(roles);
    const allRolePerms = await db
      .select({ roleId: rolePermissions.roleId, permName: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

    const permsByRoleId = new Map<number, string[]>();
    for (const { roleId, permName } of allRolePerms) {
      const existing = permsByRoleId.get(roleId) ?? [];
      existing.push(permName);
      permsByRoleId.set(roleId, existing);
    }

    return allRoles.map((r) => ({
      id: r.id,
      name: r.name,
      permissions: permsByRoleId.get(r.id) ?? [],
    }));
  });
```

- [ ] **Step 2: Verify the file saved correctly**

```bash
head -5 apps/backend/src/routes/admin.ts
```

Expected output:
```
import { Elysia } from 'elysia';
import { z } from 'zod';
import { db } from '../db';
```

---

### Task 2: Register admin routes in backend + add frontend types

**Files:**
- Modify: `apps/backend/src/index.ts`
- Modify: `apps/frontend/src/types/index.ts`

- [ ] **Step 1: Add adminRoutes import and `.use()` call to `apps/backend/src/index.ts`**

Add this import after the existing imports (line 12, after `materialsRoutes`):
```typescript
import { adminRoutes } from './routes/admin';
```

Add `.use(adminRoutes)` after `.use(materialsRoutes)` (line 31):
```typescript
  .use(materialsRoutes)
  .use(adminRoutes)
  .listen(PORT);
```

- [ ] **Step 2: Verify the backend starts without errors**

```bash
cd apps/backend && bun run dev &
sleep 3 && curl -s http://localhost:3001/health
```

Expected: `{"status":"ok","timestamp":"..."}`. Kill the dev server after verifying.

- [ ] **Step 3: Add admin types to `apps/frontend/src/types/index.ts`**

Append these three interfaces at the end of the file:

```typescript
export interface AdminUser {
  id: number;
  login: string;
  email: string;
  name: string | null;
  deletedAt: string | null;
  roles: RoleName[];
}

export interface AdminAuditLog {
  id: number;
  actorId: number;
  actorLogin: string | null;
  description: string;
  happenedAt: string;
}

export interface AdminRole {
  id: number;
  name: RoleName;
  permissions: string[];
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/routes/admin.ts apps/backend/src/index.ts apps/frontend/src/types/index.ts
git commit -m "feat: add admin backend routes and frontend types"
```

---

### Task 3: Frontend — useAdminManager hook

**Files:**
- Create: `apps/frontend/src/hooks/useAdminManager.ts`

- [ ] **Step 1: Create `apps/frontend/src/hooks/useAdminManager.ts` with the full content below**

```typescript
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdminUser, AdminAuditLog, AdminRole, RoleName } from '@/types';

export function useAdminManager() {
  const queryClient = useQueryClient();
  const [userQuery, setUserQuery] = useState('');
  const [logQuery, setLogQuery] = useState('');

  const { data: adminUsers = [], isPending: usersLoading } = useQuery({
    queryKey: ['admin-users', userQuery],
    queryFn: () =>
      api
        .get<AdminUser[]>(`/admin/users?q=${encodeURIComponent(userQuery)}`)
        .catch(() => []),
  });

  const { data: adminLogs = [], isPending: logsLoading } = useQuery({
    queryKey: ['admin-logs', logQuery],
    queryFn: () =>
      api
        .get<AdminAuditLog[]>(`/admin/audit-logs?q=${encodeURIComponent(logQuery)}`)
        .catch(() => []),
  });

  const { data: adminRoles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.get<AdminRole[]>('/admin/roles').catch(() => []),
  });

  async function assignRole(userId: number, role: RoleName) {
    await api.patch(`/admin/users/${userId}/roles`, { add: [role] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  }

  async function removeRole(userId: number, role: RoleName) {
    await api.patch(`/admin/users/${userId}/roles`, { remove: [role] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  }

  return {
    adminUsers,
    usersLoading,
    userQuery,
    setUserQuery,
    adminLogs,
    logsLoading,
    logQuery,
    setLogQuery,
    adminRoles,
    assignRole,
    removeRole,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/hooks/useAdminManager.ts
git commit -m "feat: add useAdminManager hook"
```

---

### Task 4: Frontend — update admin-users-manager.tsx

**Files:**
- Modify: `apps/frontend/src/components/admin/admin-users-manager.tsx`

- [ ] **Step 1: Replace the entire content of `apps/frontend/src/components/admin/admin-users-manager.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/admin/admin-users-manager.tsx
git commit -m "feat: connect admin users manager to API"
```

---

### Task 5: Frontend — update logs, roles, and index

**Files:**
- Modify: `apps/frontend/src/components/admin/admin-logs-view.tsx`
- Modify: `apps/frontend/src/components/admin/admin-roles-manager.tsx`
- Modify: `apps/frontend/src/routes/admin/index.tsx`

- [ ] **Step 1: Replace entire content of `apps/frontend/src/components/admin/admin-logs-view.tsx`**

```tsx
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
```

- [ ] **Step 2: Replace entire content of `apps/frontend/src/components/admin/admin-roles-manager.tsx`**

```tsx
import { useAdminManager } from '@/hooks/useAdminManager';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminRolesManager() {
  const { adminRoles } = useAdminManager();

  return (
    <div className="grid max-w-3xl gap-4">
      {adminRoles.map((role) => (
        <Card key={role.id}>
          <CardHeader className="space-y-0">
            <CardTitle className="text-lg">{role.name}</CardTitle>
            <CardDescription>Permission bundle for this role.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.map((p) => (
                <Badge key={p} variant="outline">
                  {p}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Replace entire content of `apps/frontend/src/routes/admin/index.tsx`**

```tsx
import type { ReactNode } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { useAdminManager } from '@/hooks/useAdminManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, FileText, Shield, SlidersHorizontal, Users } from 'lucide-react';

const tiles: { to: string; title: string; description: string; icon: ReactNode }[] = [
  {
    to: '/admin/settings',
    title: 'System settings',
    description: 'Feature flags, limits, and global preferences.',
    icon: <SlidersHorizontal className="size-5 text-indigo-600" />,
  },
  {
    to: '/admin/logs',
    title: 'System logs',
    description: 'Audit trail and security events.',
    icon: <FileText className="size-5 text-indigo-600" />,
  },
  {
    to: '/admin/database',
    title: 'Database',
    description: 'Health, backups, and operational tools.',
    icon: <Database className="size-5 text-indigo-600" />,
  },
  {
    to: '/admin/users',
    title: 'Users',
    description: 'Accounts, activation, and profile administration.',
    icon: <Users className="size-5 text-indigo-600" />,
  },
  {
    to: '/admin/roles',
    title: 'Roles',
    description: 'RBAC roles and permission bundles.',
    icon: <Shield className="size-5 text-indigo-600" />,
  },
];

function AdminOverviewPage() {
  const { adminUsers, adminLogs, adminRoles } = useAdminManager();

  return (
    <div>
      <AdminPageHeader title="Administration" description="Manage system configuration, review logs, and control access." />
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{adminUsers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">Log events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{adminLogs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{adminRoles.length}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="mt-0.5 rounded-lg bg-indigo-50 p-2">{t.icon}</div>
                <div>
                  <CardTitle className="text-lg">{t.title}</CardTitle>
                  <CardDescription>{t.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/admin/')({
  component: AdminOverviewPage,
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/admin/admin-logs-view.tsx apps/frontend/src/components/admin/admin-roles-manager.tsx apps/frontend/src/routes/admin/index.tsx
git commit -m "feat: connect admin logs, roles, and overview to API"
```
