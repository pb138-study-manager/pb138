# Backend Auth Middleware + Tasks API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Supabase JWT auth middleware into ElysiaJS and implement the 5 core task endpoints (list, create, update, soft-delete, toggle-done) backed by a real PostgreSQL DB via Drizzle ORM.

**Architecture:** Each resource lives in its own Elysia plugin file under `src/routes/`. A shared `authMiddleware` plugin verifies Supabase JWTs and attaches `{ user }` to context. An `audit.ts` service handles `logAction` calls required on every mutation.

**Tech Stack:** Bun, ElysiaJS 1.x, `@elysiajs/jwt`, Drizzle ORM, PostgreSQL 16, `bun:test`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `apps/backend/src/services/audit.ts` | `logAction` helper — inserts into `audit_logs` |
| Create | `apps/backend/src/middleware/auth.ts` | Verifies Supabase JWT, looks up local user, attaches `{ user }` to context |
| Create | `apps/backend/src/routes/tasks.ts` | 5 task endpoints (all behind authMiddleware) |
| Create | `apps/backend/src/routes/tasks.test.ts` | Integration tests for all task endpoints |
| Modify | `apps/backend/src/index.ts` | Register `tasksRoutes` |
| Create | `apps/backend/.env.example` | Document required env vars including `SUPABASE_JWT_SECRET` |

---

## Task 1: Install dependency + create `.env.example`

**Files:**
- Modify: `apps/backend/package.json` (via bun add)
- Create: `apps/backend/.env.example`

- [ ] **Step 1: Install `@elysiajs/jwt`**

Run from `apps/backend/`:
```bash
bun add @elysiajs/jwt
```
Expected: `@elysiajs/jwt` appears in `package.json` dependencies.

- [ ] **Step 2: Create `.env.example`**

Create `apps/backend/.env.example`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pb138
PORT=3001
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/package.json apps/backend/bun.lockb apps/backend/.env.example
git commit -m "feat: add @elysiajs/jwt dependency and env example"
```

---

## Task 2: Audit service

**Files:**
- Create: `apps/backend/src/services/audit.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/services/audit.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { db } from '../db';
import { auditLogs, users } from '../db/schema';
import { logAction } from './audit';
import { eq } from 'drizzle-orm';

let testUserId: number;

beforeAll(async () => {
  const [user] = await db.insert(users).values({
    email: 'audit-test@example.com',
    login: 'audit-test-user',
    pwdHash: 'hash',
  }).returning();
  testUserId = user.id;
});

afterAll(async () => {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));
});

describe('logAction', () => {
  it('inserts a row into audit_logs', async () => {
    await logAction(db, testUserId, 'test action');
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.actorId, testUserId));
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].description).toBe('test action');
    expect(logs[0].actorId).toBe(testUserId);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/backend && bun test src/services/audit.test.ts
```
Expected: FAIL — `logAction` not found.

- [ ] **Step 3: Implement `audit.ts`**

Create `apps/backend/src/services/audit.ts`:
```typescript
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { auditLogs } from '../db/schema';

export async function logAction(
  db: PostgresJsDatabase,
  actorId: number,
  description: string
): Promise<void> {
  await db.insert(auditLogs).values({ actorId, description });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/backend && bun test src/services/audit.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/audit.ts apps/backend/src/services/audit.test.ts
git commit -m "feat: add audit logAction service"
```

---

## Task 3: Auth middleware

**Files:**
- Create: `apps/backend/src/middleware/auth.ts`

The middleware verifies the Supabase JWT, extracts the `sub` claim (Supabase user UUID = `authId`), looks up the local user, and attaches `{ user: { id, roles } }` to Elysia context.

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/middleware/auth.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../db';
import { users, roles, userRoles } from '../db/schema';
import { authMiddleware } from './auth';
import { eq } from 'drizzle-orm';

const TEST_SECRET = 'test-supabase-secret';
process.env.SUPABASE_JWT_SECRET = TEST_SECRET;

// Helper: sign a JWT with the test secret
async function signToken(sub: string): Promise<string> {
  const signer = new Elysia().use(jwt({ name: 'jwt', secret: TEST_SECRET }));
  await signer.handle(new Request('http://localhost/'));
  // Use jose directly (available as transitive dep of @elysiajs/jwt)
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(TEST_SECRET);
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
}

const testAuthId = 'test-supabase-uuid-auth-mw';
let testUserId: number;

const testApp = new Elysia()
  .use(authMiddleware)
  .get('/protected', ({ user }) => ({ id: user.id, roles: user.roles }));

beforeAll(async () => {
  const [user] = await db.insert(users).values({
    email: 'auth-mw-test@example.com',
    login: 'auth-mw-test-user',
    pwdHash: '',
    authId: testAuthId,
  }).returning();
  testUserId = user.id;
});

afterAll(async () => {
  await db.delete(userRoles).where(eq(userRoles.userId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));
});

describe('authMiddleware', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await testApp.handle(new Request('http://localhost/protected'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    const res = await testApp.handle(
      new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer invalid.token.here' },
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 200 with user id when token is valid', async () => {
    const token = await signToken(testAuthId);
    const res = await testApp.handle(
      new Request('http://localhost/protected', {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(testUserId);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && bun test src/middleware/auth.test.ts
```
Expected: FAIL — `authMiddleware` not found.

- [ ] **Step 3: Implement `auth.ts`**

Create `apps/backend/src/middleware/auth.ts`:
```typescript
import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../db';
import { users, userRoles, roles } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .use(jwt({ name: 'jwt', secret: process.env.SUPABASE_JWT_SECRET! }))
  .derive(async ({ jwt, headers, set }) => {
    const token = headers.authorization?.replace('Bearer ', '');
    if (!token) {
      set.status = 401;
      throw new Error(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Missing token' }));
    }

    const payload = await jwt.verify(token);
    if (!payload || !payload.sub) {
      set.status = 401;
      throw new Error(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Invalid token' }));
    }

    const [localUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.authId, payload.sub as string), isNull(users.deletedAt)));

    if (!localUser) {
      set.status = 404;
      throw new Error(JSON.stringify({ error: 'USER_NOT_FOUND', message: 'No local user for this account' }));
    }

    const userRoleRows = await db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, localUser.id));

    return {
      user: {
        id: localUser.id,
        roles: userRoleRows.map((r) => r.name as string),
      },
    };
  });
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && bun test src/middleware/auth.test.ts
```
Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/middleware/auth.ts apps/backend/src/middleware/auth.test.ts
git commit -m "feat: add Supabase JWT auth middleware"
```

---

## Task 4: Tasks routes — GET /tasks + POST /tasks

**Files:**
- Create: `apps/backend/src/routes/tasks.ts`
- Create: `apps/backend/src/routes/tasks.test.ts`

- [ ] **Step 1: Write failing tests for GET + POST**

Create `apps/backend/src/routes/tasks.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../db';
import { tasks, users, auditLogs } from '../db/schema';
import { tasksRoutes } from './tasks';
import { and, eq, isNull } from 'drizzle-orm';

// Inject a fake user into context — bypasses JWT verification for route tests
const fakeAuth = new Elysia().derive(() => ({
  user: { id: 0, roles: ['USER'] }, // overridden in beforeAll
}));

let testUserId: number;
let testApp: Elysia;

beforeAll(async () => {
  const [user] = await db.insert(users).values({
    email: 'tasks-test@example.com',
    login: 'tasks-test-user',
    pwdHash: '',
    authId: 'tasks-test-supabase-uuid',
  }).returning();
  testUserId = user.id;

  testApp = new Elysia()
    .derive(() => ({ user: { id: testUserId, roles: ['USER'] } }))
    .use(tasksRoutes);
});

afterAll(async () => {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, testUserId));
  await db.delete(tasks).where(eq(tasks.userId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));
});

describe('GET /tasks', () => {
  it('returns empty array when user has no tasks', async () => {
    const res = await testApp.handle(new Request('http://localhost/tasks'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('returns tasks belonging to the user', async () => {
    await db.insert(tasks).values({
      userId: testUserId,
      title: 'Test task',
      dueDate: new Date('2026-12-31'),
    });

    const res = await testApp.handle(new Request('http://localhost/tasks'));
    const body = await res.json();
    expect(body.some((t: { title: string }) => t.title === 'Test task')).toBe(true);
  });
});

describe('POST /tasks', () => {
  it('creates a task and returns it', async () => {
    const res = await testApp.handle(
      new Request('http://localhost/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New task', dueDate: '2026-12-31T00:00:00.000Z' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('New task');
    expect(body.status).toBe('TODO');
    expect(body.userId).toBe(testUserId);
  });

  it('returns 400 when title is missing', async () => {
    const res = await testApp.handle(
      new Request('http://localhost/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: '2026-12-31T00:00:00.000Z' }),
      })
    );
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && bun test src/routes/tasks.test.ts
```
Expected: FAIL — `tasksRoutes` not found.

- [ ] **Step 3: Implement GET /tasks + POST /tasks**

Create `apps/backend/src/routes/tasks.ts`:
```typescript
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { tasks } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull } from 'drizzle-orm';

export const tasksRoutes = new Elysia({ prefix: '/tasks' })
  .use(authMiddleware)
  .get('/', async ({ user }) => {
    return db.select().from(tasks).where(
      and(eq(tasks.userId, user.id), isNull(tasks.deletedAt))
    );
  })
  .post('/', async ({ body, user }) => {
    const [task] = await db.insert(tasks).values({
      userId: user.id,
      title: body.title,
      dueDate: new Date(body.dueDate),
      description: body.description,
      assignmentId: body.assignmentId,
    }).returning();
    await logAction(db, user.id, `Created task ${task.id}: ${task.title}`);
    return task;
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      dueDate: t.String(),
      description: t.Optional(t.String()),
      assignmentId: t.Optional(t.Number()),
    }),
  });
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && bun test src/routes/tasks.test.ts
```
Expected: PASS (all GET + POST tests)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/tasks.ts apps/backend/src/routes/tasks.test.ts
git commit -m "feat: add GET /tasks and POST /tasks routes"
```

---

## Task 5: Tasks routes — PATCH /tasks/:id + DELETE /tasks/:id

**Files:**
- Modify: `apps/backend/src/routes/tasks.ts`
- Modify: `apps/backend/src/routes/tasks.test.ts`

- [ ] **Step 1: Add failing tests for PATCH + DELETE**

Add to `apps/backend/src/routes/tasks.test.ts` (after existing describe blocks):
```typescript
describe('PATCH /tasks/:id', () => {
  let taskId: number;

  beforeAll(async () => {
    const [task] = await db.insert(tasks).values({
      userId: testUserId,
      title: 'Task to update',
      dueDate: new Date('2026-12-31'),
    }).returning();
    taskId = task.id;
  });

  it('updates title and returns updated task', async () => {
    const res = await testApp.handle(
      new Request(`http://localhost/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated title' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Updated title');
  });

  it('returns 404 when task does not belong to user', async () => {
    const res = await testApp.handle(
      new Request('http://localhost/tasks/999999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hacked' }),
      })
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /tasks/:id', () => {
  let taskId: number;

  beforeAll(async () => {
    const [task] = await db.insert(tasks).values({
      userId: testUserId,
      title: 'Task to delete',
      dueDate: new Date('2026-12-31'),
    }).returning();
    taskId = task.id;
  });

  it('soft-deletes the task (sets deletedAt)', async () => {
    const res = await testApp.handle(
      new Request(`http://localhost/tasks/${taskId}`, { method: 'DELETE' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify it no longer appears in GET /tasks
    const listRes = await testApp.handle(new Request('http://localhost/tasks'));
    const list = await listRes.json();
    expect(list.some((t: { id: number }) => t.id === taskId)).toBe(false);
  });

  it('returns 404 when task does not belong to user', async () => {
    const res = await testApp.handle(
      new Request('http://localhost/tasks/999999', { method: 'DELETE' })
    );
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
cd apps/backend && bun test src/routes/tasks.test.ts
```
Expected: PATCH and DELETE tests FAIL.

- [ ] **Step 3: Add PATCH + DELETE to `tasks.ts`**

Add after the `.post()` block in `apps/backend/src/routes/tasks.ts`:
```typescript
  .patch('/:id', async ({ params, body, user, set }) => {
    const [existing] = await db.select().from(tasks).where(
      and(eq(tasks.id, Number(params.id)), eq(tasks.userId, user.id), isNull(tasks.deletedAt))
    );
    if (!existing) {
      set.status = 404;
      throw new Error(JSON.stringify({ error: 'NOT_FOUND', message: 'Task not found or access denied' }));
    }
    const [updated] = await db.update(tasks)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
        ...(body.status !== undefined && { status: body.status }),
      })
      .where(eq(tasks.id, existing.id))
      .returning();
    await logAction(db, user.id, `Updated task ${existing.id}`);
    return updated;
  }, {
    body: t.Object({
      title: t.Optional(t.String({ minLength: 1 })),
      description: t.Optional(t.String()),
      dueDate: t.Optional(t.String()),
      status: t.Optional(t.Union([
        t.Literal('TODO'),
        t.Literal('IN PROGRESS'),
        t.Literal('DONE'),
      ])),
    }),
  })
  .delete('/:id', async ({ params, user, set }) => {
    const [existing] = await db.select().from(tasks).where(
      and(eq(tasks.id, Number(params.id)), eq(tasks.userId, user.id), isNull(tasks.deletedAt))
    );
    if (!existing) {
      set.status = 404;
      throw new Error(JSON.stringify({ error: 'NOT_FOUND', message: 'Task not found or access denied' }));
    }
    await db.update(tasks)
      .set({ deletedAt: new Date() })
      .where(eq(tasks.id, existing.id));
    await logAction(db, user.id, `Deleted task ${existing.id}`);
    return { success: true };
  });
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && bun test src/routes/tasks.test.ts
```
Expected: PASS (all tests including PATCH + DELETE)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/tasks.ts apps/backend/src/routes/tasks.test.ts
git commit -m "feat: add PATCH /tasks/:id and DELETE /tasks/:id routes"
```

---

## Task 6: Tasks routes — PATCH /tasks/:id/toggle-done

**Files:**
- Modify: `apps/backend/src/routes/tasks.ts`
- Modify: `apps/backend/src/routes/tasks.test.ts`

- [ ] **Step 1: Add failing tests for toggle-done**

Add to `apps/backend/src/routes/tasks.test.ts`:
```typescript
describe('PATCH /tasks/:id/toggle-done', () => {
  let taskId: number;

  beforeAll(async () => {
    const [task] = await db.insert(tasks).values({
      userId: testUserId,
      title: 'Task to toggle',
      dueDate: new Date('2026-12-31'),
      status: 'TODO',
    }).returning();
    taskId = task.id;
  });

  it('toggles TODO → DONE', async () => {
    const res = await testApp.handle(
      new Request(`http://localhost/tasks/${taskId}/toggle-done`, { method: 'PATCH' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('DONE');
  });

  it('toggles DONE → TODO', async () => {
    const res = await testApp.handle(
      new Request(`http://localhost/tasks/${taskId}/toggle-done`, { method: 'PATCH' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('TODO');
  });

  it('returns 404 when task does not belong to user', async () => {
    const res = await testApp.handle(
      new Request('http://localhost/tasks/999999/toggle-done', { method: 'PATCH' })
    );
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && bun test src/routes/tasks.test.ts
```
Expected: toggle-done tests FAIL.

- [ ] **Step 3: Add toggle-done route to `tasks.ts`**

Add before the closing semicolon of the Elysia chain in `apps/backend/src/routes/tasks.ts`. Insert after the `.delete()` block:
```typescript
  .patch('/:id/toggle-done', async ({ params, user, set }) => {
    const [existing] = await db.select().from(tasks).where(
      and(eq(tasks.id, Number(params.id)), eq(tasks.userId, user.id), isNull(tasks.deletedAt))
    );
    if (!existing) {
      set.status = 404;
      throw new Error(JSON.stringify({ error: 'NOT_FOUND', message: 'Task not found or access denied' }));
    }
    const newStatus = existing.status === 'DONE' ? 'TODO' : 'DONE';
    const [updated] = await db.update(tasks)
      .set({ status: newStatus })
      .where(eq(tasks.id, existing.id))
      .returning();
    await logAction(db, user.id, `Toggled task ${existing.id} to ${newStatus}`);
    return updated;
  });
```

- [ ] **Step 4: Run all tests to verify everything passes**

```bash
cd apps/backend && bun test src/routes/tasks.test.ts
```
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/tasks.ts apps/backend/src/routes/tasks.test.ts
git commit -m "feat: add PATCH /tasks/:id/toggle-done route"
```

---

## Task 7: Wire routes into index.ts + run full test suite

**Files:**
- Modify: `apps/backend/src/index.ts`

- [ ] **Step 1: Register tasksRoutes in `index.ts`**

Replace the contents of `apps/backend/src/index.ts`:
```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { tasksRoutes } from './routes/tasks';

const PORT = process.env.PORT ?? 3001;

const app = new Elysia()
  .use(cors())
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))
  .use(tasksRoutes)
  .listen(PORT);

console.log(`Backend running at http://localhost:${PORT}`);

export type App = typeof app;
```

- [ ] **Step 2: Run full test suite**

```bash
cd apps/backend && bun test
```
Expected: ALL tests pass — health endpoint + audit + auth middleware + all tasks routes.

- [ ] **Step 3: Verify backend starts**

```bash
cd apps/backend && bun run dev
```
Expected: `Backend running at http://localhost:3001` with no errors. Test manually:
```bash
curl http://localhost:3001/health
```
Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/index.ts
git commit -m "feat: register tasksRoutes in main app"
```

---

## Self-Review Notes

- All 5 task endpoints from spec are covered: GET list, POST create, PATCH update, DELETE soft-delete, PATCH toggle-done
- Every mutation calls `logAction` ✓
- Every PATCH/DELETE has ownership check → 404 ✓
- Soft delete sets `deletedAt`, never hard-deletes ✓
- GET list filters `isNull(tasks.deletedAt)` ✓
- All POST/PATCH bodies use `t.Object()` validation ✓
- No `any` TypeScript — strict types throughout ✓
- Eval routes explicitly out of scope ✓
- Tests bypass JWT auth using a fake `derive()` — this tests route logic cleanly; JWT verification is tested separately in `auth.test.ts` ✓
