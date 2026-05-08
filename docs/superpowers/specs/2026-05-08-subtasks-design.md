# Subtasks Design Spec

**Date:** 2026-05-08  
**Status:** Approved

---

## Overview

Add subtask support to the existing `tasks` feature. A subtask is a full task record linked to a parent task via a `parent_id` FK on the same `tasks` table. One level of nesting only (subtasks cannot have subtasks).

---

## Database Schema

Add one nullable column to `tasks`:

```typescript
parentId: integer('parent_id').references(() => tasks.id)
```

- `null` → top-level task  
- non-null → subtask belonging to the referenced parent

No new table needed.

---

## API Changes

### `POST /tasks`
- Accept optional `parentId` in body
- Validation: if `parentId` is provided, verify the parent exists, belongs to the same user, is not soft-deleted, and is itself a top-level task (no chaining)

### `GET /tasks/:id`
- Response includes `subtasks: Task[]` — all non-deleted tasks where `parent_id = id`

### `DELETE /tasks/:id` (soft-delete)
- Before soft-deleting the parent, soft-delete all subtasks where `parent_id = id`
- Log each deletion in audit_logs

### `PATCH /tasks/:id`
- Accept optional `parentId` in body
- `parentId: number` → convert existing task to subtask (attach to parent)
- `parentId: null` → detach subtask, make it a top-level task
- Validation: same rules as POST (parent must exist, belong to user, not be a subtask itself)

---

## Frontend Changes

### `useTasksManager.handleCreate`
- After creating the parent task, iterate over `subtasks: string[]` from `SubtasksDialog`
- For each subtask title, call `POST /tasks` with `{ title, dueDate: parentDueDate, parentId: newTask.id }`

### Task detail view
- `GET /tasks/:id` now returns subtasks — render them as a checklist under the task
- Each subtask shows toggle-done + delete

### Convert task to subtask
- In task detail, add a "Move to..." picker that calls `PATCH /tasks/:id` with `parentId`
- To detach: `PATCH /tasks/:id` with `parentId: null`

---

## Business Rules

1. Only one level of nesting — a subtask cannot be a parent
2. Soft-deleting a parent cascades to all its subtasks
3. Subtasks inherit `userId` from creator (always the same user as parent)
4. `GET /tasks` (list) returns only top-level tasks (`parent_id IS NULL`) to avoid duplication
5. Subtask status can be toggled independently via existing `toggle-done` endpoint

---

## Migration

1. Edit `schema.ts` — add `parentId` column  
2. `bun run db:generate` → new migration file  
3. `bun run db:migrate` → apply to DB
