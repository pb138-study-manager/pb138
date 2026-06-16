# Eval Display + Chat Tab Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show teacher evaluations (score + feedback) to students on TaskCard and in EditTaskDialog; delete unused ChatTab.tsx.

**Architecture:** Backend embeds eval via LEFT JOIN in `GET /tasks` list and a separate query in `GET /tasks/:id` detail. Frontend reads `task.eval` — no new fetch needed. Two UI additions: score badge on TaskCard + full eval section in EditTaskDialog.

**Tech Stack:** ElysiaJS + Drizzle ORM (backend), React + TanStack Query + Tailwind CSS (frontend), react-i18next for strings.

---

### Task 1: Backend — embed eval in GET /tasks list

**Files:**

- Modify: `apps/backend/src/routes/tasks.ts:53-97`

- [ ] **Step 1: Extend the SELECT to LEFT JOIN evals**

In `apps/backend/src/routes/tasks.ts`, replace the `parentTasks` query (lines 55-73) with:

```typescript
const parentTasks = await db
  .select({
    id: tasks.id,
    userId: tasks.userId,
    assignmentId: tasks.assignmentId,
    courseId: tasks.courseId,
    parentId: tasks.parentId,
    title: tasks.title,
    description: tasks.description,
    dueDate: tasks.dueDate,
    status: tasks.status,
    priority: tasks.priority,
    tags: tasks.tags,
    deletedAt: tasks.deletedAt,
    assignmentDeadline: assignments.dueDate,
    evalId: evals.id,
    evalScore: evals.score,
    evalFeedback: evals.feedback,
    evalEvaluatedAt: evals.evaluatedAt,
  })
  .from(tasks)
  .leftJoin(assignments, eq(tasks.assignmentId, assignments.id))
  .leftJoin(evals, eq(evals.taskId, tasks.id))
  .where(and(eq(tasks.userId, authUser.id), isNull(tasks.deletedAt), isNull(tasks.parentId)));
```

Note: `evals` is already imported on line 4.

- [ ] **Step 2: Map eval fields in the return**

Replace the return statement (lines 91-96) with:

```typescript
return parentTasks.map(({ evalId, evalScore, evalFeedback, evalEvaluatedAt, ...task }) => ({
  ...task,
  assignmentDeadline: task.assignmentDeadline?.toISOString() ?? null,
  subtaskCount: subtaskMap.get(task.id)?.total ?? 0,
  doneSubtaskCount: subtaskMap.get(task.id)?.done ?? 0,
  eval:
    evalId != null
      ? {
          id: evalId,
          taskId: task.id,
          score: evalScore!,
          feedback: evalFeedback!,
          evaluatedAt: evalEvaluatedAt!.toISOString(),
        }
      : null,
}));
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/backend && bun tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Start the backend: `bun run dev`

```bash
# Replace TOKEN with a real Supabase JWT from the frontend dev session
curl -s -H "Authorization: Bearer TOKEN" http://localhost:3001/tasks | jq '.[0] | {id, status, eval}'
```

Expected: `eval` key present on each task (either `null` or `{ id, score, feedback, evaluatedAt }`).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/tasks.ts
git commit -m "feat: embed eval in GET /tasks list response"
```

---

### Task 2: Backend — embed eval in GET /tasks/:id detail

**Files:**

- Modify: `apps/backend/src/routes/tasks.ts:137-157`

- [ ] **Step 1: Add eval query after fetching task detail**

Replace the `GET /:id` handler body (lines 137-157) with:

```typescript
.get('/:id', async ({ params, user, set }) => {
  const [task] = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.id, Number(params.id)),
        eq(tasks.userId, (user as AuthUser).id),
        isNull(tasks.deletedAt)
      )
    );
  if (!task) {
    set.status = 404;
    return { error: 'NOT_FOUND', message: 'Task not found or access denied' };
  }
  const subtasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.parentId, task.id), isNull(tasks.deletedAt)));
  const [evalRow] = await db.select().from(evals).where(eq(evals.taskId, task.id));
  return {
    ...task,
    subtasks,
    eval: evalRow
      ? {
          id: evalRow.id,
          taskId: evalRow.taskId,
          score: evalRow.score,
          feedback: evalRow.feedback,
          evaluatedAt: evalRow.evaluatedAt.toISOString(),
        }
      : null,
  };
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/backend && bun tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/routes/tasks.ts
git commit -m "feat: embed eval in GET /tasks/:id detail response"
```

---

### Task 3: i18n keys for eval strings

**Files:**

- Modify: `apps/frontend/src/locales/en.json`
- Modify: `apps/frontend/src/locales/cs.json`

- [ ] **Step 1: Add eval keys to English locale**

In `apps/frontend/src/locales/en.json`, add inside the `"tasks"` object:

```json
"evalLabel": "Grade",
"evalLabelFull": "Teacher grade"
```

- [ ] **Step 2: Add eval keys to Czech locale**

In `apps/frontend/src/locales/cs.json`, add inside the `"tasks"` object:

```json
"evalLabel": "Hodnotenie",
"evalLabelFull": "Hodnotenie od učiteľa"
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/locales/en.json apps/frontend/src/locales/cs.json
git commit -m "feat: add i18n keys for eval display"
```

---

### Task 4: Frontend — eval display on TaskCard

**Files:**

- Modify: `apps/frontend/src/components/tasks/tasks-card.tsx`

- [ ] **Step 1: Add score badge between content div and toggle button**

In `tasks-card.tsx`, find the line `<button onClick={handleToggle}` (line 249). Insert the score badge immediately before it:

```tsx
{
  task.eval && isChecked && (
    <span className="shrink-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded-md border border-green-200 dark:border-green-800">
      {task.eval.score} b.
    </span>
  );
}
```

- [ ] **Step 2: Add feedback block below the card content**

Find the closing `</div>` of the `p-4 flex items-center gap-3` div (line 258 — the one that closes right before the subtasks toggle section). Insert the feedback block immediately after that `</div>`:

```tsx
{
  task.eval && isChecked && (
    <div className="px-4 pb-3">
      <div className="border-l-2 border-green-400 dark:border-green-600 pl-2 bg-green-50 dark:bg-green-900/20 rounded-r-md py-1.5 px-2">
        <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-0.5">
          {t('tasks.evalLabel')}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
          "{task.eval.feedback}"
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/frontend && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Visual check in browser**

Start both servers:

```bash
# Terminal 1
cd apps/backend && bun run dev

# Terminal 2 (repo root)
pnpm --filter @pb138/frontend dev
```

Open http://localhost:5173, log in, navigate to /tasks. Find a DONE task that has been evaluated by a teacher. Verify:

- Green score badge (`XX b.`) appears to the left of the toggle button
- Green left-border feedback block appears below the card
- Feedback longer than 2 lines is cut off with `...`
- Tasks without eval show no change

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/tasks/tasks-card.tsx
git commit -m "feat: show eval score badge and feedback on TaskCard"
```

---

### Task 5: Frontend — readonly eval section in EditTaskDialog

**Files:**

- Modify: `apps/frontend/src/components/tasks/edit-task-dialog.tsx`

- [ ] **Step 1: Add eval section at bottom of dialog content**

In `edit-task-dialog.tsx`, find the closing `</div>` of the `px-6 py-6 space-y-0` div (line 328 — immediately before `</DialogContent>`). Insert the eval section immediately before that closing `</div>`:

```tsx
{
  task.eval && (
    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
      <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
        {t('tasks.evalLabelFull')}
      </p>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-bold px-2.5 py-0.5 rounded-md">
          {task.eval.score} b.
        </span>
        <span className="text-xs text-gray-400">
          {new Date(task.eval.evaluatedAt).toLocaleDateString('sk-SK')}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
        "{task.eval.feedback}"
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Visual check in browser**

Open http://localhost:5173/tasks, click a DONE task that has been evaluated. Verify:

- "Hodnotenie od učiteľa" section appears at the bottom of the dialog
- Score + date on one line, full feedback text below (no truncation)
- Section does not appear for tasks without eval

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/tasks/edit-task-dialog.tsx
git commit -m "feat: show full eval section in EditTaskDialog"
```

---

### Task 6: Cleanup — delete ChatTab.tsx

**Files:**

- Delete: `apps/frontend/src/components/ai/ChatTab.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm apps/frontend/src/components/ai/ChatTab.tsx
```

- [ ] **Step 2: Confirm nothing imports it**

```bash
grep -r "ChatTab" apps/frontend/src/
```

Expected: no output (zero references).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/frontend && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete unused ChatTab component"
```
