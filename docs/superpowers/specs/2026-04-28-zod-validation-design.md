# Zod Validation Design

**Date:** 2026-04-28  
**Status:** Approved  
**Scope:** Backend — all route files with POST/PATCH bodies

---

## Problem

The backend currently uses Elysia's native TypeBox (`t.Object()`) for request body validation. The team prefers Zod for its familiar API, expressive schema composition (`extend`, `pick`, `omit`, `refine`), and first-class TypeScript inference via `z.infer<>`.

---

## Goal

Replace all `t.Object()` body validation with Zod schemas while preserving:
- Full TypeScript inference on `body` inside route handlers
- Runtime 400 validation on bad requests
- Consistent error response format

---

## Approach: Centralised `zodBody()` helper

A single utility in `apps/backend/src/lib/validation.ts` bridges Zod and Elysia.

```typescript
import { t } from 'elysia';
import { z } from 'zod';

export function zodBody<T extends z.ZodTypeAny>(schema: T) {
  return {
    body: t.Unsafe<z.infer<T>>({}),
    beforeHandle: ({ body, set }: { body: unknown; set: { status: number } }) => {
      const result = schema.safeParse(body);
      if (!result.success) {
        set.status = 400;
        return {
          error: 'VALIDATION_ERROR',
          fields: result.error.flatten().fieldErrors,
        };
      }
    },
  };
}
```

### How it works

- `body: t.Unsafe<z.infer<T>>({})` — tells Elysia the TypeScript shape of the body without running TypeBox validation. Handlers get fully typed `body`.
- `beforeHandle` — runs before every handler. Calls `schema.safeParse(body)`. On failure, returns 400 immediately and the handler never executes.

---

## Error Format

```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "title": ["String must contain at least 1 character(s)"],
    "dueDate": ["Required"]
  }
}
```

Consistent with the existing error shape used across all routes (`{ error, message?, fields? }`).

---

## Scope of Changes

| File | Change |
|---|---|
| `apps/backend/src/lib/validation.ts` | **New** — `zodBody()` helper |
| `apps/backend/src/routes/tasks.ts` | Replace `t.Object()` with Zod schemas + `zodBody()` |
| `apps/backend/src/routes/events.ts` | Same |
| `apps/backend/src/routes/notes.ts` | Same |
| `apps/backend/src/routes/folders.ts` | Same |
| `apps/backend/src/routes/groups.ts` | Same |
| `apps/backend/src/routes/users.ts` | Same |
| `apps/backend/src/routes/courses.ts` | Same |
| `apps/backend/package.json` | Add `zod` dependency |

`auth.ts` — excluded (no body validation needed).  
`admin.ts` — excluded (not yet implemented).

---

## Schema Placement

Zod schemas are defined at the top of each route file, one per POST/PATCH endpoint. GET and DELETE routes have no body schemas.

Example (`tasks.ts`):

```typescript
const CreateTaskSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string(),
  description: z.string().optional(),
  assignmentId: z.number().optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['TODO', 'IN PROGRESS', 'DONE']).optional(),
});
```

---

## Where Zod Adds Real Value Over TypeBox

| Scenario | Before | After |
|---|---|---|
| Cross-field check (`startDate ≤ endDate`) | Manual if-check inside handler | `.refine()` on schema |
| Email / regex format | Manual check | `z.string().email()`, `.regex()` |
| Reusing shapes | Copy-paste | `.extend()`, `.pick()`, `.omit()` |
| TypeScript inference outside routes | Not possible | `z.infer<typeof Schema>` anywhere |

---

## What Does NOT Change

- Route handler logic (no handler code changes)
- Database queries
- Auth middleware
- Soft delete / audit log patterns
- Test files (tests already send raw JSON, validation is transparent to them)
