# Sprint A — Quick Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four user-visible bugs: hardcoded Slovak strings on Today page, task/event forms always requiring a date, tasks without a date showing no countdown badge, and no default date on new task/event dialogs.

**Architecture:** All changes are pure frontend. No new backend routes. Touch utility functions first (task-utils), then i18n keys, then hooks, then UI components — so each layer is solid before the next one builds on it.

**Tech Stack:** React 18, TypeScript, react-i18next, Vitest

---

## File Map

| File | Change |
|---|---|
| `src/lib/task-utils.ts` | Add `noDateLabel` param to `getCountdown` |
| `src/lib/task-utils.test.ts` | Update tests for new `getCountdown` signature |
| `src/locales/en.json` | Add `today.*` and `tasks.noDate` keys |
| `src/locales/cs.json` | Same keys in Czech |
| `src/routes/today/index.tsx` | Replace hardcoded Slovak with `t()` calls |
| `src/hooks/useTodayManager.ts` | `handleCreate` accepts `dueDate: string \| null` |
| `src/hooks/useTasksManager.ts` | `handleCreate` accepts `dueDate: string \| null` |
| `src/components/tasks/tasks-section.tsx` | Update `onTaskCreated` prop type |
| `src/components/tasks/new-tasks-dialog.tsx` | Default date = today, allow no-date submit |
| `src/components/tasks/tasks-card.tsx` | Show "No date" badge; pass `t('tasks.noDate')` |
| `src/components/timeline/NewEventDialog.tsx` | Default `startDate` = today |

---

## Task 1: Update `getCountdown` to support a "no date" label

**Files:**
- Modify: `src/lib/task-utils.ts`
- Modify: `src/lib/task-utils.test.ts`

- [ ] **Step 1: Update failing tests first**

Replace the two `getCountdown` null/undefined tests in `src/lib/task-utils.test.ts`:

```typescript
it('returns the noDateLabel when dueDate is null', () => {
  expect(getCountdown(null, 'No date')).toBe('No date');
  expect(getCountdown(null)).toBe('');
});

it('returns the noDateLabel when dueDate is undefined', () => {
  expect(getCountdown(undefined, 'No date')).toBe('No date');
  expect(getCountdown(undefined)).toBe('');
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @pb138/frontend test --run
```

Expected: 2 failures — `getCountdown(null, 'No date')` returns `''` not `'No date'`.

- [ ] **Step 3: Update `getCountdown` in `src/lib/task-utils.ts`**

```typescript
export function getCountdown(dueDate: string | null | undefined, noDateLabel = ''): string {
  if (!dueDate) return noDateLabel;
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return 'Overdue';
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}
```

- [ ] **Step 4: Run tests to confirm they all pass**

```bash
pnpm --filter @pb138/frontend test --run
```

Expected: all 44 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/task-utils.ts apps/frontend/src/lib/task-utils.test.ts
git commit -m "feat: getCountdown accepts optional noDateLabel param"
```

---

## Task 2: Add i18n keys for Today page and "No date"

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/cs.json`

- [ ] **Step 1: Add keys to `src/locales/en.json`**

Add a `"today"` section and a `"noDate"` key inside `"tasks"`:

```json
{
  "tasks": {
    ...existing keys...,
    "noDate": "No date"
  },
  "today": {
    "greetingMorning": "Good morning",
    "greetingAfternoon": "Good afternoon",
    "greetingEvening": "Good evening",
    "progress": "{{done}} of {{total}} tasks done today"
  }
}
```

- [ ] **Step 2: Add the same keys to `src/locales/cs.json`**

```json
{
  "tasks": {
    ...existing keys...,
    "noDate": "Bez dátumu"
  },
  "today": {
    "greetingMorning": "Dobré ráno",
    "greetingAfternoon": "Dobrý deň",
    "greetingEvening": "Dobrý večer",
    "progress": "{{done}} z {{total}} úloh hotových dnes"
  }
}
```

- [ ] **Step 3: Run build to catch any JSON syntax errors**

```bash
pnpm --filter @pb138/frontend build
```

Expected: builds successfully.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/locales/en.json apps/frontend/src/locales/cs.json
git commit -m "feat: add today greeting and noDate i18n keys"
```

---

## Task 3: Fix Today page hardcoded Slovak strings

**Files:**
- Modify: `src/routes/today/index.tsx`

- [ ] **Step 1: Replace `getGreeting()` and progress string**

Remove the `getGreeting` function entirely. Replace with i18n inside `TodayPage`:

```typescript
function TodayPage() {
  const { t } = useTranslation();
  // ... existing hook calls ...

  const h = new Date().getHours();
  const greeting =
    h >= 5 && h < 12
      ? t('today.greetingMorning')
      : h >= 12 && h < 18
        ? t('today.greetingAfternoon')
        : t('today.greetingEvening');
```

Then replace the `<h1>` and subtitle `<p>`:

```tsx
<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
  {greeting} 👋
</h1>
<p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
  {t('today.progress', { done: counts.done, total: todayTotal })}
</p>
```

- [ ] **Step 2: Run build to confirm no TypeScript errors**

```bash
pnpm --filter @pb138/frontend build
```

Expected: builds successfully.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/routes/today/index.tsx
git commit -m "fix: replace hardcoded Slovak greeting and progress text on Today page"
```

---

## Task 4: Allow task creation without a date + default to today

**Files:**
- Modify: `src/hooks/useTodayManager.ts`
- Modify: `src/hooks/useTasksManager.ts`
- Modify: `src/components/tasks/tasks-section.tsx`
- Modify: `src/components/tasks/new-tasks-dialog.tsx`

- [ ] **Step 1: Update `handleCreate` in `src/hooks/useTodayManager.ts`**

Change the signature from `dueDate: string` to `dueDate: string | null`:

```typescript
async function handleCreate(title: string, dueDate: string | null, subtaskTitles: string[] = [], description?: string, courseId?: number) {
  const newTask = await api.post<Task>('/tasks', { title, dueDate, description, courseId });
  await Promise.all(
    subtaskTitles.map((subTitle) =>
      api.post<Task>('/tasks', { title: subTitle, dueDate, parentId: newTask.id })
    )
  );
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
}
```

- [ ] **Step 2: Update `handleCreate` in `src/hooks/useTasksManager.ts`**

Same change — `dueDate: string` → `dueDate: string | null`:

```typescript
async function handleCreate(title: string, dueDate: string | null, subtaskTitles: string[] = [], description?: string, courseId?: number) {
  const newTask = await api.post<Task>('/tasks', { title, dueDate, description, courseId });
  await Promise.all(
    subtaskTitles.map((subTitle) =>
      api.post<Task>('/tasks', { title: subTitle, dueDate, parentId: newTask.id })
    )
  );
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
}
```

- [ ] **Step 3: Update `onTaskCreated` prop type in `src/components/tasks/tasks-section.tsx`**

Find line 26 and change:

```typescript
onTaskCreated: (title: string, dueDate: string | null, subtasks: string[], description?: string, courseId?: number) => Promise<void>;
```

- [ ] **Step 4: Update `new-tasks-dialog.tsx`**

Four changes:
1. Default `selectedDate` to today
2. Update `onSubmit` prop type
3. Remove `!selectedDate` from submit guard and disabled check
4. Pass `selectedDate?.toISOString() ?? null`

```typescript
// Line 24 — default to today
const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());

// onSubmit prop type — line 20
onSubmit: (title: string, dueDate: string | null, subtasks: string[], description?: string, courseId?: number) => Promise<void>;

// handleSubmit — remove !selectedDate from guard (line 38)
async function handleSubmit() {
  if (!taskName.trim()) return;
  setSaving(true);
  try {
    await onSubmit(taskName.trim(), selectedDate?.toISOString() ?? null, subtasks, undefined, selectedCourse?.id);
    setTaskName('');
    setSelectedDate(null);
    setSubtasks([]);
    setSelectedCourse(null);
    onOpenChange(false);
  } finally {
    setSaving(false);
  }
}

// Submit button disabled — line 136: remove !selectedDate
disabled={!taskName.trim() || saving}
```

- [ ] **Step 5: Run build**

```bash
pnpm --filter @pb138/frontend build
```

Expected: builds successfully. Fix any remaining TypeScript errors before continuing.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/hooks/useTodayManager.ts apps/frontend/src/hooks/useTasksManager.ts apps/frontend/src/components/tasks/tasks-section.tsx apps/frontend/src/components/tasks/new-tasks-dialog.tsx
git commit -m "feat: default task date to today, allow task creation without a date"
```

---

## Task 5: Show "No date" badge on tasks without a due date

**Files:**
- Modify: `src/components/tasks/tasks-card.tsx`

- [ ] **Step 1: Update `getCountdown` call to pass the i18n label**

In `tasks-card.tsx`, change line 73:

```typescript
const countdown = getCountdown(task.dueDate, t('tasks.noDate'));
```

- [ ] **Step 2: Render the badge for all non-done tasks (including no-date)**

Currently the badge only renders when `urgency` is non-null (line 165). Change to:

```tsx
{task.status !== 'DONE' && countdown && (
  <span
    className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
      urgency ? urgencyColors[urgency] : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
    }`}
  >
    {countdown}
  </span>
)}
```

- [ ] **Step 3: Run build**

```bash
pnpm --filter @pb138/frontend build
```

Expected: builds successfully.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/tasks/tasks-card.tsx
git commit -m "feat: show No date badge on tasks without a due date"
```

---

## Task 6: Default timeline event date to today

**Files:**
- Modify: `src/components/timeline/NewEventDialog.tsx`

- [ ] **Step 1: Default `startDate` to today**

Change line 19 from:

```typescript
const [startDate, setStartDate] = useState<Date | null>(null)
```

to:

```typescript
const [startDate, setStartDate] = useState<Date | null>(() => new Date())
```

Note: the `useEffect` reset on close (line 27-33) already resets `startDate` to `null` when `isOpen` becomes false. Change that reset to use today instead:

```typescript
useEffect(() => {
  if (isOpen) return
  setTitle('')
  setStartDate(new Date())
  setEndDate(null)
  setDescription('')
  setType('EVENT')
}, [isOpen])
```

- [ ] **Step 2: Run build**

```bash
pnpm --filter @pb138/frontend build
```

Expected: builds successfully.

- [ ] **Step 3: Run all tests**

```bash
pnpm --filter @pb138/frontend test --run
```

Expected: all 44 tests pass.

- [ ] **Step 4: Commit and push**

```bash
git add apps/frontend/src/components/timeline/NewEventDialog.tsx
git commit -m "feat: default event start date to today in timeline dialog"
git push
```

---

## Self-Check

| Spec requirement | Task |
|---|---|
| Today greeting translates | Task 3 |
| Today progress text translates | Task 3 |
| New task defaults to today | Task 4 |
| Task can be created without a date | Task 4 |
| "No date" badge on dateless tasks | Task 5 |
| New event defaults to today | Task 6 |
| i18n keys added to both locales | Task 2 |
| `getCountdown` updated + tests updated | Task 1 |
