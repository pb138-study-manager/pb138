# Zod Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all Elysia TypeBox `t.Object()` body validation with Zod schemas using a centralised `zodBody()` helper, preserving full TypeScript inference in route handlers.

**Architecture:** A single `zodBody(schema)` utility wraps a Zod schema into an Elysia-compatible config object — `t.Unsafe<z.infer<T>>` gives TypeScript inference, a `beforeHandle` hook gives runtime validation. Each route file defines its own Zod schemas at the top, then passes them to `zodBody()` in place of `t.Object()`. Handler code does not change.

**Tech Stack:** Zod, ElysiaJS `t.Unsafe`, Bun test

---

## File Map

| File | Action |
|---|---|
| `apps/backend/src/lib/validation.ts` | Create — `zodBody()` helper |
| `apps/backend/src/routes/tasks.ts` | Modify — replace 2 `t.Object()` calls |
| `apps/backend/src/routes/events.ts` | Modify — replace 2 `t.Object()` calls + move date refine into schema |
| `apps/backend/src/routes/notes.ts` | Modify — replace 2 `t.Object()` calls |
| `apps/backend/src/routes/folders.ts` | Modify — replace 2 `t.Object()` calls |
| `apps/backend/src/routes/groups.ts` | Modify — replace 3 `t.Object()` calls |
| `apps/backend/src/routes/users.ts` | Modify — replace 3 `t.Object()` calls |
| `apps/backend/src/routes/courses.ts` | Modify — replace 2 `t.Object()` calls |
| `apps/backend/package.json` | Modify — add `zod` dependency |

---

## Task 1: Install Zod and create `zodBody()` helper

**Files:**
- Modify: `apps/backend/package.json`
- Create: `apps/backend/src/lib/validation.ts`

- [ ] **Step 1: Install Zod**

Run from `apps/backend/`:
```bash
bun add zod
```

Expected: `zod` appears in `apps/backend/package.json` dependencies.

- [ ] **Step 2: Create the validation helper**

Create `apps/backend/src/lib/validation.ts`:

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

- [ ] **Step 3: Run existing tests to confirm baseline**

Run from `apps/backend/`:
```bash
bun test
```

Expected: All tests pass. This is the green baseline before any migration.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/package.json apps/backend/bun.lockb apps/backend/src/lib/validation.ts
git commit -m "feat: add zod and zodBody validation helper"
```

---

## Task 2: Migrate tasks.ts

**Files:**
- Modify: `apps/backend/src/routes/tasks.ts`

- [ ] **Step 1: Add Zod schemas and update imports at the top of the file**

Replace the first line:
```typescript
import { Elysia, t } from 'elysia';
```
With:
```typescript
import { Elysia, t } from 'elysia';
import { z } from 'zod';
import { zodBody } from '../lib/validation';
```

Add these schemas directly below the imports (before the route definition):

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

- [ ] **Step 2: Replace POST /tasks body validation**

Find and replace:
```typescript
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        dueDate: t.String(),
        description: t.Optional(t.String()),
        assignmentId: t.Optional(t.Number()),
      }),
    }
```
With:
```typescript
    zodBody(CreateTaskSchema)
```

- [ ] **Step 3: Replace PATCH /tasks/:id body validation**

Find and replace:
```typescript
    {
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String()),
        dueDate: t.Optional(t.String()),
        status: t.Optional(
          t.Union([t.Literal('TODO'), t.Literal('IN PROGRESS'), t.Literal('DONE')])
        ),
      }),
    }
```
With:
```typescript
    zodBody(UpdateTaskSchema)
```

- [ ] **Step 4: Remove unused `t` import if no longer used elsewhere in the file**

Check if `t` is still used anywhere in `tasks.ts`. If the only usages were the two `t.Object()` calls you just replaced, change the import to:
```typescript
import { Elysia } from 'elysia';
```

- [ ] **Step 5: Run tasks tests**

```bash
bun test src/routes/tasks.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/routes/tasks.ts
git commit -m "feat: migrate tasks routes to zod validation"
```

---

## Task 3: Migrate events.ts

**Files:**
- Modify: `apps/backend/src/routes/events.ts`

> Note: The current PATCH handler manually checks `startDate ≤ endDate`. This moves into the Zod schema via `.refine()`, so the manual if-check is removed from the handler.

- [ ] **Step 1: Update imports and add schemas**

Add after existing imports:
```typescript
import { z } from 'zod';
import { zodBody } from '../lib/validation';
```

Add schemas below imports:

```typescript
const CreateEventSchema = z.object({
  title: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string().optional(),
  place: z.string().optional(),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'startDate must not be after endDate', path: ['startDate'] }
);

const UpdateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  place: z.string().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'startDate must not be after endDate', path: ['startDate'] }
);
```

- [ ] **Step 2: Replace POST /events body validation**

Find and replace:
```typescript
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        startDate: t.String(),
        endDate: t.String(),
        description: t.Optional(t.String()),
        place: t.Optional(t.String()),
      }),
    }
```
With:
```typescript
    zodBody(CreateEventSchema)
```

- [ ] **Step 3: Remove manual date check from PATCH handler and replace body validation**

In the PATCH `/:id` handler, find and remove this block at the top of the handler function:
```typescript
      if (body.startDate && body.endDate && new Date(body.startDate) > new Date(body.endDate)) {
        set.status = 400;
        return { error: 'INVALID_DATE_RANGE', message: 'startDate must not be after endDate' };
      }
```

Then find and replace the PATCH body validation:
```typescript
    {
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        place: t.Optional(t.String()),
      }),
    }
```
With:
```typescript
    zodBody(UpdateEventSchema)
```

- [ ] **Step 4: Remove unused `t` import if no longer used**

If `t` is only used in the removed `t.Object()` calls, update the import:
```typescript
import { Elysia } from 'elysia';
```

- [ ] **Step 5: Run events tests**

```bash
bun test src/routes/events.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/routes/events.ts
git commit -m "feat: migrate events routes to zod validation with refine date check"
```

---

## Task 4: Migrate notes.ts

**Files:**
- Modify: `apps/backend/src/routes/notes.ts`

- [ ] **Step 1: Update imports and add schemas**

Add after existing imports:
```typescript
import { z } from 'zod';
import { zodBody } from '../lib/validation';
```

Add schemas below imports:

```typescript
const CreateNoteSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  folderId: z.number().optional(),
  courseId: z.number().optional(),
});

const UpdateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  folderId: z.number().nullable().optional(),
  courseId: z.number().nullable().optional(),
});
```

- [ ] **Step 2: Replace POST /notes body validation**

Find and replace:
```typescript
      body: t.Object({
        title: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        folderId: t.Optional(t.Number()),
        courseId: t.Optional(t.Number()),
      }),
```
With (as a spread inside the route config object):
```typescript
    zodBody(CreateNoteSchema)
```

- [ ] **Step 3: Replace PATCH /notes/:id body validation**

Find and replace:
```typescript
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String()),
        folderId: t.Optional(t.Number()),
        courseId: t.Optional(t.Number()),
      }),
```
With:
```typescript
    zodBody(UpdateNoteSchema)
```

- [ ] **Step 4: Remove unused `t` import if no longer used**

- [ ] **Step 5: Run notes tests**

```bash
bun test src/routes/notes.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/routes/notes.ts
git commit -m "feat: migrate notes routes to zod validation"
```

---

## Task 5: Migrate folders.ts

**Files:**
- Modify: `apps/backend/src/routes/folders.ts`

- [ ] **Step 1: Update imports and add schemas**

Add after existing imports:
```typescript
import { z } from 'zod';
import { zodBody } from '../lib/validation';
```

Add schemas below imports:

```typescript
const CreateFolderSchema = z.object({
  name: z.string().min(1),
});

const UpdateFolderSchema = z.object({
  name: z.string().min(1),
});
```

- [ ] **Step 2: Replace POST /folders body validation**

Find and replace:
```typescript
      body: t.Object({
        name: t.String({ minLength: 1 }),
      }),
```
With:
```typescript
    zodBody(CreateFolderSchema)
```

- [ ] **Step 3: Replace PATCH /folders/:id body validation**

Find and replace the second occurrence of:
```typescript
      body: t.Object({
        name: t.String({ minLength: 1 }),
      }),
```
With:
```typescript
    zodBody(UpdateFolderSchema)
```

- [ ] **Step 4: Remove unused `t` import if no longer used**

- [ ] **Step 5: Run folders tests**

```bash
bun test src/routes/folders.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/routes/folders.ts
git commit -m "feat: migrate folders routes to zod validation"
```

---

## Task 6: Migrate groups.ts

**Files:**
- Modify: `apps/backend/src/routes/groups.ts`

- [ ] **Step 1: Update imports and add schemas**

Add after existing imports:
```typescript
import { z } from 'zod';
import { zodBody } from '../lib/validation';
```

Add schemas below imports:

```typescript
const CreateGroupSchema = z.object({
  name: z.string().min(1),
});

const AddMembersSchema = z.object({
  userIds: z.array(z.number()),
});

const CreateAssignmentSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string(),
  description: z.string().optional(),
});
```

- [ ] **Step 2: Replace POST /groups body validation**

Find and replace:
```typescript
      body: t.Object({
        name: t.String({ minLength: 1 }),
      }),
```
With:
```typescript
    zodBody(CreateGroupSchema)
```

- [ ] **Step 3: Replace POST /groups/:id/members body validation**

Find and replace:
```typescript
      body: t.Object({
        userIds: t.Array(t.Number()),
      }),
```
With:
```typescript
    zodBody(AddMembersSchema)
```

- [ ] **Step 4: Replace POST /groups/:id/assignments body validation**

Find and replace:
```typescript
      body: t.Object({
        title: t.String({ minLength: 1 }),
        dueDate: t.String(),
        description: t.Optional(t.String()),
      }),
```
With:
```typescript
    zodBody(CreateAssignmentSchema)
```

- [ ] **Step 5: Remove unused `t` import if no longer used**

- [ ] **Step 6: Run groups tests**

```bash
bun test src/routes/groups.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/routes/groups.ts
git commit -m "feat: migrate groups routes to zod validation"
```

---

## Task 7: Migrate users.ts

**Files:**
- Modify: `apps/backend/src/routes/users.ts`

- [ ] **Step 1: Update imports and add schemas**

Add after existing imports:
```typescript
import { z } from 'zod';
import { zodBody } from '../lib/validation';
```

Add schemas below imports:

```typescript
const UpdateProfileSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  organization: z.string().optional(),
  bio: z.string().optional(),
});

const UpdateSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  lightTheme: z.boolean().optional(),
});

const ChangePasswordSchema = z.object({
  newPassword: z.string().min(8),
});
```

- [ ] **Step 2: Replace PATCH /users/me/profile body validation**

Find and replace:
```typescript
      body: t.Object({
        name: t.Optional(t.String()),
        title: t.Optional(t.String()),
        organization: t.Optional(t.String()),
        bio: t.Optional(t.String()),
      }),
```
With:
```typescript
    zodBody(UpdateProfileSchema)
```

- [ ] **Step 3: Replace PATCH /users/me/settings body validation**

Find and replace:
```typescript
      body: t.Object({
        notificationsEnabled: t.Optional(t.Boolean()),
        lightTheme: t.Optional(t.Boolean()),
      }),
```
With:
```typescript
    zodBody(UpdateSettingsSchema)
```

- [ ] **Step 4: Replace PATCH /users/me/password body validation**

Find and replace:
```typescript
      body: t.Object({
        newPassword: t.String({ minLength: 8 }),
      }),
```
With:
```typescript
    zodBody(ChangePasswordSchema)
```

- [ ] **Step 5: Remove unused `t` import if no longer used**

- [ ] **Step 6: Run users tests**

```bash
bun test src/routes/users.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/routes/users.ts
git commit -m "feat: migrate users routes to zod validation"
```

---

## Task 8: Migrate courses.ts

**Files:**
- Modify: `apps/backend/src/routes/courses.ts`

- [ ] **Step 1: Update imports and add schemas**

Add after existing imports:
```typescript
import { z } from 'zod';
import { zodBody } from '../lib/validation';
```

Add schemas below imports:

```typescript
const CreateCourseSchema = z.object({
  code: z.string().min(1),
  semester: z.string().min(1),
  name: z.string().optional(),
  color: z.string().optional(),
  lectureSchedule: z.string().optional(),
  seminarSchedule: z.string().optional(),
  lectureTeacherId: z.number().optional(),
  seminarTeacherId: z.number().optional(),
});

const UpdateCourseSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().optional(),
  semester: z.string().min(1).optional(),
  color: z.string().optional(),
  lectureSchedule: z.string().optional(),
  seminarSchedule: z.string().optional(),
  lectureTeacherId: z.number().optional(),
  seminarTeacherId: z.number().optional(),
});
```

- [ ] **Step 2: Replace POST /courses body validation**

Find and replace:
```typescript
      body: t.Object({
        code: t.String({ minLength: 1 }),
        semester: t.String({ minLength: 1 }),
        name: t.Optional(t.String()),
        color: t.Optional(t.String()),
        lectureSchedule: t.Optional(t.String()),
        seminarSchedule: t.Optional(t.String()),
        lectureTeacherId: t.Optional(t.Number()),
        seminarTeacherId: t.Optional(t.Number()),
      }),
```
With:
```typescript
    zodBody(CreateCourseSchema)
```

- [ ] **Step 3: Replace PATCH /courses/:id body validation**

Find and replace:
```typescript
      body: t.Object({
        code: t.Optional(t.String({ minLength: 1 })),
        name: t.Optional(t.String()),
        semester: t.Optional(t.String({ minLength: 1 })),
        color: t.Optional(t.String()),
        lectureSchedule: t.Optional(t.String()),
        seminarSchedule: t.Optional(t.String()),
        lectureTeacherId: t.Optional(t.Number()),
        seminarTeacherId: t.Optional(t.Number()),
      }),
```
With:
```typescript
    zodBody(UpdateCourseSchema)
```

- [ ] **Step 4: Remove unused `t` import if no longer used**

- [ ] **Step 5: Run courses tests**

```bash
bun test src/routes/courses.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/routes/courses.ts
git commit -m "feat: migrate courses routes to zod validation"
```

---

## Task 9: Full test suite verification

- [ ] **Step 1: Run all backend tests**

Run from `apps/backend/`:
```bash
bun test
```

Expected: All tests pass (same count as before migration started).

- [ ] **Step 2: Run lint**

Run from the repo root:
```bash
pnpm lint
```

Expected: No errors.

- [ ] **Step 3: Push branch**

```bash
git push
```
