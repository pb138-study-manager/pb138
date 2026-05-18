# Admin Panel — Design Spec

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this spec task-by-task.

**Goal:** Connect the existing admin panel UI shell to real backend APIs — users list with role management, audit logs, and roles display. Remove all mock data.

**Architecture:** New `admin.ts` route file on the backend behind ADMIN role guard. Frontend replaces mock data with `useQuery` / `useMutation` calls via the existing `api` helper, following the same hook-per-page pattern used everywhere else in the codebase (e.g. `useTasksManager`, `useNotesManager`).

**Tech Stack:** ElysiaJS + Drizzle ORM (backend), React + TanStack Query + existing `api` helper (frontend), Zod + `zodBody()` for validation.

---

## Scope

### In scope
- `GET /admin/users` — paginated list of all users with their roles
- `PATCH /admin/users/:id/roles` — add or remove a role from a user
- `GET /admin/audit-logs` — read-only log list with optional text filter, limit/offset
- `GET /admin/roles` — static list of roles with their permissions
- Frontend: replace mock data in `admin-users-manager.tsx`, `admin-logs-view.tsx`, `admin-roles-manager.tsx`, `admin/index.tsx` with real API calls
- New hook `useAdminManager.ts` following existing patterns

### Out of scope
- `settings.tsx` — stays as UI placeholder (no `system_settings` table exists)
- `database.tsx` — stays as UI placeholder (infra-level concerns)
- Creating or deleting users (Supabase Auth owns user creation)
- Deactivating accounts (no `active` column on `users` table — only soft delete)

---

## Backend — `apps/backend/src/routes/admin.ts`

### Auth guard
Every endpoint: verify `authUser.roles.includes('ADMIN')`, return 403 otherwise. Same pattern as TEACHER checks in `courses.ts`.

### Endpoints

#### `GET /admin/users`
Query params: `?q=` (optional text filter on login/email), `?limit=50&offset=0`

Response shape:
```typescript
{
  id: number;
  login: string;
  email: string;
  name: string | null;
  deletedAt: string | null;
  roles: string[]; // role names
}[]
```

Implementation: JOIN `users` → `user_roles` → `roles`. Group roles per user in application layer (map by userId). Filter with `ilike` on login/email if `q` is provided. Always exclude `isNull(users.deletedAt)`.

#### `PATCH /admin/users/:id/roles`
Body (Zod): `{ add?: RoleName[], remove?: RoleName[] }` where `RoleName = 'USER' | 'ADMIN' | 'TEACHER'`

Logic:
1. Verify target user exists (404 if not)
2. For each role in `add`: lookup role id, insert into `user_roles` (on conflict do nothing)
3. For each role in `remove`: lookup role id, delete from `user_roles`
4. Audit log: `"Admin ${authUser.id} updated roles for user ${targetId}"`
5. Return updated roles list for the user

#### `GET /admin/audit-logs`
Query params: `?q=` (filter on description), `?limit=50&offset=0`

Response shape:
```typescript
{
  id: number;
  actorId: number;
  actorLogin: string | null;
  description: string;
  happenedAt: string; // ISO string
}[]
```

Implementation: JOIN `audit_logs` → `users` (LEFT JOIN, actor may be deleted). Apply `ilike` filter on `description` if `q` provided. Order by `happenedAt DESC`.

#### `GET /admin/roles`
No params. Returns all roles with their permissions:
```typescript
{
  id: number;
  name: string;
  permissions: string[];
}[]
```

Implementation: SELECT all from `roles` + JOIN `role_permissions` → `permissions`. Group in application layer.

### Registration
Add `adminRoutes` to `apps/backend/src/index.ts` alongside existing routes.

---

## Frontend

### New types in `apps/frontend/src/types/index.ts`
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

### New hook `apps/frontend/src/hooks/useAdminManager.ts`
Pattern matches `useTasksManager` / `useNotesManager`:
- `useQuery(['admin-users', query])` → `api.get('/admin/users?q=...')`
- `useQuery(['admin-logs', query])` → `api.get('/admin/audit-logs?q=...')`
- `useQuery(['admin-roles'])` → `api.get('/admin/roles')`
- `assignRole(userId, role)` → `api.patch('/admin/users/:id/roles', { add: [role] })`
- `removeRole(userId, role)` → `api.patch('/admin/users/:id/roles', { remove: [role] })`
- After role mutation: `queryClient.invalidateQueries(['admin-users'])`

### Component updates

**`admin-users-manager.tsx`**
- Remove `mockAdminUsers` import
- Accept data from `useAdminManager`
- Role management: each user row gets an "Edit roles" button that opens a small Dialog with checkboxes for USER / TEACHER / ADMIN — on save calls `PATCH /admin/users/:id/roles` with the diff (add/remove)
- Show `deletedAt` as "Deleted" badge if not null

**`admin-logs-view.tsx`**
- Remove `mockAuditLogs` import
- Accept data from `useAdminManager`
- Show `actorLogin` in Actor column (fallback to `actorId` if null)
- Show `happenedAt` formatted as local datetime

**`admin-roles-manager.tsx`**
- Remove `mockRoles` import
- Accept data from `useAdminManager`
- Read-only display (no mutations — roles and permissions are static)

**`admin/index.tsx`**
- Replace `mockAdminUsers.length`, `mockAuditLogs.length`, `mockRoles.length` with live counts from queries
- Remove "All data on this page is mock UI" disclaimer text

### Consistency rules (match existing codebase)
- All data fetching through `useAdminManager` hook — no inline `useQuery` in components
- Components receive data as props from the route page (same pattern as `courses/$courseId.tsx` passes data to sub-components)
- Error states: silently return `[]` on fetch failure (`.catch(() => [])`) — same as all other hooks
- Loading state: show nothing / skeleton only if `isPending` (don't block render)
- Dark mode classes on all new elements (`dark:bg-gray-900` etc.) — check existing admin components for the exact pattern used

---

## File Summary

| Action | File |
|--------|------|
| Create | `apps/backend/src/routes/admin.ts` |
| Modify | `apps/backend/src/index.ts` — register adminRoutes |
| Create | `apps/frontend/src/hooks/useAdminManager.ts` |
| Modify | `apps/frontend/src/types/index.ts` — add AdminUser, AdminAuditLog, AdminRole |
| Modify | `apps/frontend/src/components/admin/admin-users-manager.tsx` |
| Modify | `apps/frontend/src/components/admin/admin-logs-view.tsx` |
| Modify | `apps/frontend/src/components/admin/admin-roles-manager.tsx` |
| Modify | `apps/frontend/src/routes/admin/index.tsx` |
