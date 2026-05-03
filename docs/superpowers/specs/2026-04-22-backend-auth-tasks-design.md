# Backend: Auth Middleware + Tasks API Design

**Date:** 2026-04-22  
**Author:** Peter Perveka  
**Scope:** Supabase JWT auth middleware + core tasks CRUD routes

---

## Goal

Wire the backend to accept authenticated requests via Supabase JWTs and implement the 5 core task endpoints that the frontend tasks page currently mocks with hardcoded data.

---

## Architecture

```
Request
  └── Elysia app (index.ts)
        └── tasksRoutes (prefix: /tasks)
              └── authMiddleware
                    └── Supabase JWT verify → local user lookup → { user }
                          └── route handler → db → logAction → response
```

---

## Section 1: Auth Middleware

**File:** `apps/backend/src/middleware/auth.ts`

**Behavior:**
1. Read `Authorization: Bearer <token>` from request headers
2. Verify JWT using `@elysiajs/jwt` with `SUPABASE_JWT_SECRET`
3. Extract `sub` claim (Supabase user UUID)
4. Query `users` table where `authId = sub AND deletedAt IS NULL`
5. Query `user_roles` joined with `roles` to build `roles[]` array
6. Attach `{ user: { id: number, roles: string[] } }` to Elysia context

**Error cases:**
- Missing/invalid token → 401 `{ error: 'UNAUTHORIZED', message: 'Invalid or missing token' }`
- User not found in local DB → 404 `{ error: 'USER_NOT_FOUND', message: 'No local user record for this account' }`

**Environment variable:** `SUPABASE_JWT_SECRET` — from Supabase project settings → API → JWT Secret.

---

## Section 2: Tasks Routes

**File:** `apps/backend/src/routes/tasks.ts`  
**Prefix:** `/tasks`  
**Auth:** all routes require `authMiddleware`

### Endpoints

#### GET /tasks
- Select all tasks where `userId = user.id AND deletedAt IS NULL`
- Returns array of task objects

#### POST /tasks
- Insert new task with `userId = user.id`
- Call `logAction(db, user.id, 'Created task ${id}: ${title}')`
- Return created task row

**Body validation:**
```typescript
t.Object({
  title: t.String({ minLength: 1 }),
  dueDate: t.String(),
  description: t.Optional(t.String()),
  assignmentId: t.Optional(t.Number()),
})
```

#### PATCH /tasks/:id
- Ownership check: SELECT where `id = :id AND userId = user.id AND deletedAt IS NULL` → 404 if not found
- Update only provided fields (title, description, dueDate, status)
- Call `logAction(db, user.id, 'Updated task ${id}')`
- Return updated task row

**Body validation:**
```typescript
t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  dueDate: t.Optional(t.String()),
  status: t.Optional(t.Union([t.Literal('TODO'), t.Literal('IN PROGRESS'), t.Literal('DONE')])),
})
```

#### DELETE /tasks/:id
- Ownership check → 404 if not found
- Soft delete: `SET deletedAt = now()` (never hard delete)
- Call `logAction(db, user.id, 'Deleted task ${id}')`
- Return `{ success: true }`

#### PATCH /tasks/:id/toggle-done
- Ownership check → 404 if not found
- If `status === 'DONE'` → set to `'TODO'`; otherwise → set to `'DONE'`
- Call `logAction(db, user.id, 'Toggled task ${id} to ${newStatus}')`
- Return updated task row

---

## Section 3: Supporting Pieces

### Audit Service
**File:** `apps/backend/src/services/audit.ts`

```typescript
export async function logAction(db, actorId: number, description: string) {
  await db.insert(auditLogs).values({ actorId, description });
}
```

Every INSERT, PATCH, and soft-DELETE must call this.

### index.ts wiring
```typescript
import { tasksRoutes } from './routes/tasks';
app.use(tasksRoutes);
```

---

## Environment Variables

Add to `apps/backend/.env.example`:
```
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here
```

---

## What is NOT in scope

- Eval routes (`POST/GET /tasks/:id/eval`) — deferred
- Events, Notes, Users, Groups, Admin routes — separate sessions
- Email notifications — separate session
- Cron/deadline checker — separate session

---

## Key Rules (from CLAUDE.md)

- **Soft delete only** — never hard DELETE
- **Audit every mutation** — `logAction` on every INSERT/UPDATE/soft-DELETE
- **Ownership check** — every PATCH/DELETE verifies `userId = user.id`
- **No `any` TypeScript** — strict types throughout
- **Elysia `t.Object` validation** — every POST/PATCH body validated
