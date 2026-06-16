# Sprint B — Tags & Priority Design

**Date:** 2026-06-08  
**Scope:** Add priority (Low/Medium/High) and custom user-defined tags to tasks. Stored in the database. Full stack: schema → API → frontend UI.

---

## Data Model

### Schema changes to `tasks` table (`apps/backend/src/db/schema.ts`)

```typescript
// New enum (add alongside existing enums)
export const taskPriorityEnum = pgEnum('task_priority', ['LOW', 'MEDIUM', 'HIGH']);

// New columns on tasks table
priority: taskPriorityEnum('priority'),         // nullable — null means no priority set
tags: text('tags').array().notNull().default([]), // text array, default empty
```

Apply via `bun run db:push` (dev) — no migration file needed.

---

## Backend API Changes (`apps/backend/src/routes/tasks.ts`)

### Validation schemas

Add `priority` and `tags` to `CreateTaskSchema` and `UpdateTaskSchema`:

```typescript
priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
tags: z.array(z.string().min(1).max(50)).max(20).optional(),
```

### Endpoints affected

| Endpoint           | Change                                            |
| ------------------ | ------------------------------------------------- |
| `GET /tasks`       | Returns `priority` and `tags` in each task object |
| `POST /tasks`      | Accepts optional `priority` and `tags` in body    |
| `PATCH /tasks/:id` | Accepts optional `priority` and `tags` in body    |
| `GET /tasks/:id`   | Returns `priority` and `tags`                     |

No new endpoints needed.

---

## Frontend Type (`apps/frontend/src/types/index.ts`)

Add to `Task` interface:

```typescript
priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
tags?: string[];
```

---

## Frontend UI

### `NewTaskDialog` (`apps/frontend/src/components/tasks/new-tasks-dialog.tsx`)

The dialog already has stub pills for Tags and Priority with `onClick: () => {}`. Replace these with working implementations:

**Priority pill:** Clicking cycles through `null → 'LOW' → 'MEDIUM' → 'HIGH' → null`. Label and color update live:

- No priority: gray pill, label "Priority"
- LOW: green pill, label "Low"
- MEDIUM: amber pill, label "Medium"
- HIGH: red pill, label "High"

**Tags pill:** Clicking opens a small inline tag input area below the pills. User types a tag name and presses Enter (or comma) to add it. Each tag appears as a removable chip. Pressing Escape or clicking elsewhere closes the input. Max 20 tags, max 50 chars each.

Pass `priority` and `tags` to `onSubmit`.

### `EditTaskDialog` (`apps/frontend/src/components/tasks/edit-task-dialog.tsx`)

Same priority and tags UI, pre-populated from the existing task data.

### `TaskCard` (`apps/frontend/src/components/tasks/tasks-card.tsx`)

Show priority badge and tag chips below the task title (only when set):

- Priority badge: small colored pill (same colors as dialog)
- Tags: small gray chips, truncated if more than 3 (show "+N more")

### `onSubmit` / `handleCreate` / `handleEditFull` signatures

`handleCreate` in both hooks: add `priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null` and `tags?: string[]` params.

`handleEditFull` data object: add `priority` and `tags`.

`TaskSection.onTaskCreated` prop: add `priority` and `tags`.

---

## i18n

Add to both `en.json` and `cs.json`:

```json
"tasks": {
  "priority": "Priority",
  "priorityLow": "Low",
  "priorityMedium": "Medium",
  "priorityHigh": "High",
  "tags": "Tags",
  "addTag": "Add tag..."
}
```

---

## Affected Files

| File                                                      | Change                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/backend/src/db/schema.ts`                           | Add `taskPriorityEnum`, `priority` + `tags` columns to tasks |
| `apps/backend/src/routes/tasks.ts`                        | Accept + return `priority` and `tags` in CRUD                |
| `apps/frontend/src/types/index.ts`                        | Add `priority` and `tags` to `Task` interface                |
| `apps/frontend/src/locales/en.json`                       | Add priority/tags i18n keys                                  |
| `apps/frontend/src/locales/cs.json`                       | Same                                                         |
| `apps/frontend/src/components/tasks/new-tasks-dialog.tsx` | Working priority + tags UI                                   |
| `apps/frontend/src/components/tasks/edit-task-dialog.tsx` | Same, pre-populated                                          |
| `apps/frontend/src/components/tasks/tasks-card.tsx`       | Show priority badge + tag chips                              |
| `apps/frontend/src/hooks/useTodayManager.ts`              | Pass priority + tags in handleCreate                         |
| `apps/frontend/src/hooks/useTasksManager.ts`              | Pass priority + tags in handleCreate + handleEditFull        |
| `apps/frontend/src/components/tasks/tasks-section.tsx`    | Update onTaskCreated prop type                               |

---

## Out of Scope

- Tag autocomplete / suggestion from previous tags (can be added later)
- Filtering tasks by tag or priority (Sprint C)
- Tags on subtasks (subtasks inherit parent context)
