# Backend Controller Refactor — Design Spec

**Date:** 2026-06-22  
**Author:** Peter Perveka  
**Status:** Approved

---

## Context

Presentation feedback: backend route files are too large and not sufficiently layered. Files like `courses.ts` (867 lines) and `ai.ts` (547 lines) mix Zod schemas, Elysia route definitions, database queries, and business rules in one place. Goal: introduce a controller layer to separate concerns.

---

## Decision

**2 layers:** `routes/` (thin) + `controllers/` (logic)

A 3-layer approach (routes + controllers + services) was considered but rejected — the project has straightforward CRUD without shared business logic that would justify the extra layer.

---

## Architecture

### Folder structure

```
src/
├── lib/
│   ├── errors.ts            ← NEW: custom error classes
│   └── validation.ts        ← unchanged
├── controllers/             ← NEW folder
│   ├── tasks.controller.ts
│   ├── events.controller.ts
│   ├── notes.controller.ts
│   ├── folders.controller.ts
│   ├── users.controller.ts
│   ├── groups.controller.ts
│   ├── courses.controller.ts
│   ├── auth.controller.ts
│   ├── ai.controller.ts
│   ├── admin.controller.ts
│   ├── materials.controller.ts
│   └── search.controller.ts
├── routes/                  ← thinned out, only Elysia + Zod
├── middleware/              ← unchanged
├── services/                ← unchanged
├── db/                      ← unchanged
└── index.ts                 ← adds global onError handler
```

### Request flow

```
HTTP request
  → Elysia route (Zod validation)
  → controller function (DB logic + business rules)
  → response
         ↓ on error
    throw AppError
         ↓
    onError handler → { error, message }
```

---

## `lib/errors.ts`

Five error classes covering all cases in the current codebase:

```ts
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(404, 'NOT_FOUND', message); }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Invalid or missing token') { super(401, 'UNAUTHORIZED', message); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') { super(403, 'FORBIDDEN', message); }
}

export class BadRequestError extends AppError {
  constructor(message: string) { super(400, 'BAD_REQUEST', message); }
}
```

Global handler added to `index.ts` before route registration:

```ts
app.onError(({ error, set }) => {
  if (error instanceof AppError) {
    set.status = error.status;
    return { error: error.code, message: error.message };
  }
  set.status = 500;
  return { error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' };
});
```

---

## Controller pattern

Controllers are plain async functions — no Elysia dependency, only TypeScript, Drizzle, and our error classes.

```ts
// controllers/tasks.controller.ts
import { db } from '../db';
import { tasks, evals } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import type { CreateTaskInput, UpdateTaskInput } from '../routes/tasks';

export async function listTasks(user: AuthUser) {
  // all DB logic here
  return ...;
}

export async function createTask(user: AuthUser, body: CreateTaskInput) {
  if (body.parentId !== undefined) {
    const [parent] = await db.select()...
    if (!parent) throw new NotFoundError('Parent task not found or is itself a subtask');
  }
  const [task] = await db.insert(tasks).values({ ... }).returning();
  await logAction(db, user.id, `Created task ${task.id}: ${task.title}`);
  return task;
}
```

---

## Route pattern (thin)

```ts
// routes/tasks.ts
import * as TasksController from '../controllers/tasks.controller';

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const tasksRoutes = new Elysia({ prefix: '/tasks' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) { set.status = 401; return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' }; }
  })
  .get('/', ({ user }) => TasksController.listTasks(user as AuthUser))
  .post('/', ({ user, body }) => TasksController.createTask(user as AuthUser, body), zodBody(CreateTaskSchema))
  .patch('/:id', ({ user, params, body }) => TasksController.updateTask(user as AuthUser, Number(params.id), body), zodBody(UpdateTaskSchema))
  .delete('/:id', ({ user, params }) => TasksController.deleteTask(user as AuthUser, Number(params.id)))
```

Each route handler is a single line — a controller function call.

---

## Input types

Zod schemas stay in routes. Controllers import only the inferred TypeScript type (type-only import — erased at runtime, no circular dependency at runtime):

```ts
// routes/tasks.ts
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

// controllers/tasks.controller.ts
import type { CreateTaskInput } from '../routes/tasks';
```

---

## Tests

Existing tests in `routes/*.test.ts` test HTTP endpoints (integration tests via Elysia). **No changes needed** — the refactor is transparent to tests. After each migration step, run `bun test` to verify nothing broke.

---

## Migration order

Smallest files first — learn the pattern before tackling the large ones.

| Step | File | Lines |
|------|------|-------|
| 1 | `lib/errors.ts` + `index.ts` onError | new |
| 2 | `routes/auth.ts` | 61 |
| 3 | `routes/search.ts` | 71 |
| 4 | `routes/folders.ts` | 102 |
| 5 | `routes/notes.ts` | 159 |
| 6 | `routes/events.ts` | 248 |
| 7 | `routes/materials.ts` | 249 |
| 8 | `routes/admin.ts` | 331 |
| 9 | `routes/groups.ts` | 337 |
| 10 | `routes/tasks.ts` | 394 |
| 11 | `routes/users.ts` | 422 |
| 12 | `routes/ai.ts` | 547 |
| 13 | `routes/courses.ts` | 867 |

After each step: `bun test` — if green, the migration was successful.