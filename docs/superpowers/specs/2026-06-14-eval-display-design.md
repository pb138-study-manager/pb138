# Eval Display + Chat Tab Cleanup — Design Spec

**Date:** 2026-06-14  
**Status:** Approved

---

## Overview

Two independent changes:

1. **Eval display** — show teacher evaluations (score + feedback) to students on their task cards and in the task detail dialog.
2. **Chat tab cleanup** — delete the unused `ChatTab.tsx` dead code.

---

## Feature 1: Eval Display

### Context

The backend already supports teacher evaluations via:

- `POST /tasks/:id/eval` — teacher creates/updates eval (MENTOR/TEACHER role only)
- `GET /tasks/:id/eval` — fetch eval for a specific task

The `Eval` TypeScript interface already exists in `apps/frontend/src/types/index.ts` and the `Task` interface already has an optional `eval?: Eval` field.

**What's missing:** the backend list/detail endpoints don't embed eval data, and there is no UI to display it.

---

### Backend Changes

**File:** `apps/backend/src/routes/tasks.ts`

**`GET /tasks` (list endpoint):**

- Add a LEFT JOIN on the `evals` table keyed on `evals.task_id = tasks.id`
- Embed the eval as `eval: { id, score, feedback, evaluatedAt } | null` on each task object
- Only return eval where `evals.task_id` matches — no extra filtering needed (eval is 1:1 with task)

**`GET /tasks/:id` (detail endpoint):**

- Same change: embed eval in the response alongside subtasks
- Currently returns `{ ...task, subtasks: [...] }` → becomes `{ ...task, subtasks: [...], eval: {...} | null }`

No new endpoints. Eval creation/update stays MENTOR/TEACHER only.

---

### Frontend Changes

#### TaskCard — `apps/frontend/src/components/tasks/tasks-card.tsx`

Render a new eval block below existing card content, **only when `task.eval` exists and `task.status === 'DONE'`**:

- **Score badge:** rendered top-right next to the task title. Format: `{score} b.` (raw number, no assumed max — backend `score` field has no upper bound). Green styling (matches DONE state).
- **Feedback block:** green left-border block with label "Hodnotenie" and feedback text truncated to **2 lines** (`line-clamp-2`). Full text visible in EditTaskDialog.
- If `task.eval` is null or task is not DONE: no change to existing card layout.

#### EditTaskDialog — `apps/frontend/src/components/tasks/edit-task-dialog.tsx`

Add a readonly "Hodnotenie od učiteľa" section at the bottom of the dialog, visible only when `task.eval` exists:

- Score + date on one line: `92 b. · 15.6.2026`
- Full feedback text (no truncation)
- Entirely readonly — no inputs

---

### Data Flow

```
GET /tasks
  └─ backend LEFT JOINs evals
  └─ returns tasks[] with eval embedded
       └─ useTasksManager stores tasks with eval
            └─ TaskCard reads task.eval
                 └─ shows score badge + truncated feedback
            └─ EditTaskDialog reads task.eval
                 └─ shows full eval section
```

No separate eval fetch. No loading state needed for eval (comes with the task list).

---

## Feature 2: Chat Tab Cleanup

**File to delete:** `apps/frontend/src/components/ai/ChatTab.tsx`

`AICopilotPanel.tsx` already defines `type Tab = 'brief' | 'agent'` and does not import or render `ChatTab`. The file is dead code. No other files reference it.

**Action:** delete the file. No other changes needed.

---

## Out of Scope

- Teacher-side "needs evaluation" indicator for DONE tasks without eval (not in demo scope)
- Eval display on `/today` page task list (same component, will inherit automatically)
- Persistent chat history for AI agent

---

## Files Changed

| File                                                      | Change                                           |
| --------------------------------------------------------- | ------------------------------------------------ |
| `apps/backend/src/routes/tasks.ts`                        | LEFT JOIN evals in GET /tasks and GET /tasks/:id |
| `apps/frontend/src/components/tasks/tasks-card.tsx`       | Score badge + truncated feedback block           |
| `apps/frontend/src/components/tasks/edit-task-dialog.tsx` | Readonly eval section                            |
| `apps/frontend/src/components/ai/ChatTab.tsx`             | Delete                                           |
