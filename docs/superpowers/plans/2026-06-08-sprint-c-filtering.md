# Sprint C — Task Filtering by Priority and Tag

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a filter bar to `/tasks` and `/today` pages that lets users filter tasks by priority (Low/Medium/High) and tag, with AND logic.

**Architecture:** Pure client-side — no backend changes. A new `filterTasks()` utility does AND filtering. A new `TaskFilterBar` component renders clickable priority + tag pills. Filter state lives in each page component; the hooks return full unfiltered lists as before.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, react-i18next, Vitest (unit tests for filterTasks)

---

## File Map

| File | Change |
|---|---|
| `apps/frontend/src/lib/task-utils.ts` | Add `filterTasks()` |
| `apps/frontend/src/lib/task-utils.test.ts` | Add `filterTasks` tests |
| `apps/frontend/src/components/tasks/task-filter-bar.tsx` | New component |
| `apps/frontend/src/locales/en.json` | 3 i18n keys |
| `apps/frontend/src/locales/cs.json` | Same in Czech |
| `apps/frontend/src/routes/tasks/index.tsx` | Filter state + bar + filtered sections |
| `apps/frontend/src/routes/today/index.tsx` | Same |

---

### Task 1: `filterTasks` utility + tests

**Files:**
- Modify: `apps/frontend/src/lib/task-utils.ts`
- Modify: `apps/frontend/src/lib/task-utils.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `apps/frontend/src/lib/task-utils.test.ts` (after the existing `splitTasks` describe block):

```typescript
describe('filterTasks', () => {
  it('returns all tasks when both sets are empty', () => {
    const tasks = [
      makeTask({ id: 1, priority: 'HIGH', tags: ['math'] }),
      makeTask({ id: 2, priority: null }),
      makeTask({ id: 3, tags: [] }),
    ];
    expect(filterTasks(tasks, new Set(), new Set())).toHaveLength(3);
  });

  it('filters by a single priority', () => {
    const tasks = [
      makeTask({ id: 1, priority: 'HIGH' }),
      makeTask({ id: 2, priority: 'LOW' }),
      makeTask({ id: 3, priority: null }),
    ];
    const result = filterTasks(tasks, new Set(['HIGH']), new Set());
    expect(result.map((t) => t.id)).toEqual([1]);
  });

  it('filters by multiple priorities (OR within priority set)', () => {
    const tasks = [
      makeTask({ id: 1, priority: 'HIGH' }),
      makeTask({ id: 2, priority: 'LOW' }),
      makeTask({ id: 3, priority: 'MEDIUM' }),
    ];
    const result = filterTasks(tasks, new Set(['HIGH', 'LOW']), new Set());
    expect(result.map((t) => t.id)).toContain(1);
    expect(result.map((t) => t.id)).toContain(2);
    expect(result.map((t) => t.id)).not.toContain(3);
  });

  it('filters by a single tag', () => {
    const tasks = [
      makeTask({ id: 1, tags: ['math', 'hw'] }),
      makeTask({ id: 2, tags: ['science'] }),
      makeTask({ id: 3, tags: [] }),
    ];
    const result = filterTasks(tasks, new Set(), new Set(['math']));
    expect(result.map((t) => t.id)).toEqual([1]);
  });

  it('requires all selected tags to be present (AND)', () => {
    const tasks = [
      makeTask({ id: 1, tags: ['math', 'hw'] }),
      makeTask({ id: 2, tags: ['math'] }),
    ];
    const result = filterTasks(tasks, new Set(), new Set(['math', 'hw']));
    expect(result.map((t) => t.id)).toEqual([1]);
  });

  it('combines priority AND tag filters', () => {
    const tasks = [
      makeTask({ id: 1, priority: 'HIGH', tags: ['math'] }),
      makeTask({ id: 2, priority: 'HIGH', tags: ['science'] }),
      makeTask({ id: 3, priority: 'LOW', tags: ['math'] }),
    ];
    const result = filterTasks(tasks, new Set(['HIGH']), new Set(['math']));
    expect(result.map((t) => t.id)).toEqual([1]);
  });

  it('excludes tasks with no priority when priority filter is active', () => {
    const tasks = [
      makeTask({ id: 1, priority: null }),
      makeTask({ id: 2, priority: undefined }),
    ];
    const result = filterTasks(tasks, new Set(['HIGH']), new Set());
    expect(result).toHaveLength(0);
  });

  it('excludes tasks with no tags when tag filter is active', () => {
    const tasks = [
      makeTask({ id: 1, tags: [] }),
      makeTask({ id: 2, tags: undefined }),
    ];
    const result = filterTasks(tasks, new Set(), new Set(['math']));
    expect(result).toHaveLength(0);
  });
});
```

Also add `filterTasks` to the import at the top of the test file:
```typescript
import { getUrgency, getCountdown, splitTasks, filterTasks } from './task-utils';
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/frontend && npx vitest run src/lib/task-utils.test.ts 2>&1 | tail -10
```

Expected: several test failures mentioning `filterTasks is not a function`.

- [ ] **Step 3: Implement `filterTasks`**

Add to `apps/frontend/src/lib/task-utils.ts` (after `splitTasks`):

```typescript
export function filterTasks(
  tasks: Task[],
  priorities: Set<'LOW' | 'MEDIUM' | 'HIGH'>,
  tags: Set<string>
): Task[] {
  return tasks.filter((t) => {
    if (priorities.size > 0 && (!t.priority || !priorities.has(t.priority))) return false;
    if (tags.size > 0) {
      if (!t.tags || t.tags.length === 0) return false;
      for (const tag of tags) {
        if (!t.tags.includes(tag)) return false;
      }
    }
    return true;
  });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/frontend && npx vitest run src/lib/task-utils.test.ts 2>&1 | tail -10
```

Expected: all tests pass, including the new `filterTasks` describe block.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/task-utils.ts apps/frontend/src/lib/task-utils.test.ts
git commit -m "feat: add filterTasks utility with AND logic"
```

---

### Task 2: i18n keys

**Files:**
- Modify: `apps/frontend/src/locales/en.json`
- Modify: `apps/frontend/src/locales/cs.json`

- [ ] **Step 1: Add to `en.json`**

Inside the `"tasks"` object (after the last existing key), add:

```json
"clearFilters": "Clear"
```

- [ ] **Step 2: Add to `cs.json`**

Inside the `"tasks"` object, add:

```json
"clearFilters": "Zrušit"
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/locales/en.json apps/frontend/src/locales/cs.json
git commit -m "feat: add clearFilters i18n key"
```

---

### Task 3: `TaskFilterBar` component

**Files:**
- Create: `apps/frontend/src/components/tasks/task-filter-bar.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useTranslation } from 'react-i18next';
import { Task } from '@/types';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

const PRIORITY_PILLS: { value: Priority; labelKey: string; activeClass: string }[] = [
  { value: 'LOW',    labelKey: 'tasks.priorityLow',    activeClass: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'MEDIUM', labelKey: 'tasks.priorityMedium', activeClass: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'HIGH',   labelKey: 'tasks.priorityHigh',   activeClass: 'bg-red-100 text-red-700 border-red-300' },
];

const INACTIVE = 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500';

export default function TaskFilterBar({
  allTasks,
  activePriorities,
  activeTags,
  onTogglePriority,
  onToggleTag,
  onClear,
}: {
  allTasks: Task[];
  activePriorities: Set<Priority>;
  activeTags: Set<string>;
  onTogglePriority: (p: Priority) => void;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();

  const allUniqueTags = Array.from(
    new Set(allTasks.flatMap((t) => t.tags ?? []))
  ).sort();

  const hasAnyPriority = allTasks.some((t) => t.priority);
  const hasAnyTags = allUniqueTags.length > 0;
  const isActive = activePriorities.size > 0 || activeTags.size > 0;

  if (!hasAnyPriority && !hasAnyTags) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {hasAnyPriority && PRIORITY_PILLS.map(({ value, labelKey, activeClass }) => {
        const active = activePriorities.has(value);
        return (
          <button
            key={value}
            onClick={() => onTogglePriority(value)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${active ? activeClass : INACTIVE}`}
          >
            {t(labelKey)}
          </button>
        );
      })}

      {hasAnyTags && allUniqueTags.map((tag) => {
        const active = activeTags.has(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${active ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : INACTIVE}`}
          >
            {tag}
          </button>
        );
      })}

      {isActive && (
        <button
          onClick={onClear}
          className="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium transition-colors"
        >
          {t('tasks.clearFilters')}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/tasks/task-filter-bar.tsx
git commit -m "feat: TaskFilterBar component with priority and tag pills"
```

---

### Task 4: Wire filters into `/tasks` page

**Files:**
- Modify: `apps/frontend/src/routes/tasks/index.tsx`

- [ ] **Step 1: Read the current file**

Read `apps/frontend/src/routes/tasks/index.tsx` to understand the current structure before editing.

- [ ] **Step 2: Add imports and filter state**

At the top, add two imports:
```typescript
import { useState } from 'react';
import TaskFilterBar from '@/components/tasks/task-filter-bar';
import { filterTasks } from '@/lib/task-utils';
```

Inside `TasksPage`, after the `useTasksManager()` destructure, add:

```typescript
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
const [activePriorities, setActivePriorities] = useState<Set<Priority>>(new Set());
const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

function togglePriority(p: Priority) {
  setActivePriorities((prev) => {
    const next = new Set(prev);
    next.has(p) ? next.delete(p) : next.add(p);
    return next;
  });
}

function toggleTag(tag: string) {
  setActiveTags((prev) => {
    const next = new Set(prev);
    next.has(tag) ? next.delete(tag) : next.add(tag);
    return next;
  });
}

const allTasks = [...overdue, ...today, ...thisWeek, ...later, ...done];

const filtered = {
  overdue:  filterTasks(overdue,  activePriorities, activeTags),
  today:    filterTasks(today,    activePriorities, activeTags),
  thisWeek: filterTasks(thisWeek, activePriorities, activeTags),
  later:    filterTasks(later,    activePriorities, activeTags),
  done:     filterTasks(done,     activePriorities, activeTags),
};
```

- [ ] **Step 3: Render `TaskFilterBar` and use filtered tasks**

In the JSX, add `<TaskFilterBar />` just before the task sections div (after the `<TaskSidebar />` block). Replace `tasks={overdue}`, `tasks={today}`, etc. with `tasks={filtered.overdue}`, `tasks={filtered.today}`, etc. Also update the `count` props to match filtered lengths.

The full updated return JSX (replace everything after the `isPending` guard):

```tsx
return (
  <div className="flex-1 overflow-y-auto w-full bg-gray-50 dark:bg-gray-900 transition-colors">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-6 mb-8">
        <TaskSidebar counts={counts} />
        <div className="flex-1" />
      </div>

      <TaskFilterBar
        allTasks={allTasks}
        activePriorities={activePriorities}
        activeTags={activeTags}
        onTogglePriority={togglePriority}
        onToggleTag={toggleTag}
        onClear={() => { setActivePriorities(new Set()); setActiveTags(new Set()); }}
      />

      <div>
        {filtered.overdue.length > 0 && (
          <TaskSection
            title={t('tasks.overdue')}
            count={filtered.overdue.length}
            tasks={filtered.overdue}
            variant="overdue"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
            onEditFull={handleEditFull}
            onDelete={handleDelete}
          />
        )}
        <TaskSection
          title={t('tasks.today')}
          count={filtered.today.length}
          tasks={filtered.today}
          variant="default"
          onTaskCreated={handleCreate}
          onToggle={handleToggle}
          onEditFull={handleEditFull}
          onDelete={handleDelete}
        />
        <TaskSection
          title={t('tasks.thisWeek')}
          count={filtered.thisWeek.length}
          tasks={filtered.thisWeek}
          variant="thisWeek"
          onTaskCreated={handleCreate}
          onToggle={handleToggle}
          onEditFull={handleEditFull}
          onDelete={handleDelete}
        />
        <TaskSection
          title={t('tasks.later')}
          count={filtered.later.length}
          tasks={filtered.later}
          variant="later"
          onTaskCreated={handleCreate}
          onToggle={handleToggle}
          onEditFull={handleEditFull}
          onDelete={handleDelete}
        />
        <TaskSection
          title={t('tasks.done')}
          count={filtered.done.length}
          tasks={filtered.done}
          variant="done"
          onTaskCreated={handleCreate}
          onToggle={handleToggle}
          onEditFull={handleEditFull}
          onDelete={handleDelete}
        />
      </div>
    </div>
  </div>
);
```

- [ ] **Step 4: TypeScript check**

```bash
cd apps/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/routes/tasks/index.tsx
git commit -m "feat: filter bar on /tasks page"
```

---

### Task 5: Wire filters into `/today` page

**Files:**
- Modify: `apps/frontend/src/routes/today/index.tsx`

- [ ] **Step 1: Add imports and filter state**

At the top, add:
```typescript
import { useState } from 'react';
import TaskFilterBar from '@/components/tasks/task-filter-bar';
import { filterTasks } from '@/lib/task-utils';
```

Inside `TodayPage`, after the `useTodayManager()` destructure, add:

```typescript
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
const [activePriorities, setActivePriorities] = useState<Set<Priority>>(new Set());
const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

function togglePriority(p: Priority) {
  setActivePriorities((prev) => {
    const next = new Set(prev);
    next.has(p) ? next.delete(p) : next.add(p);
    return next;
  });
}

function toggleTag(tag: string) {
  setActiveTags((prev) => {
    const next = new Set(prev);
    next.has(tag) ? next.delete(tag) : next.add(tag);
    return next;
  });
}

const allTasks = [...todayTasks, ...backlogTasks, ...doneTasks];
const filteredToday   = filterTasks(todayTasks,   activePriorities, activeTags);
const filteredBacklog = filterTasks(backlogTasks, activePriorities, activeTags);
```

- [ ] **Step 2: Render `TaskFilterBar` and use filtered tasks**

In the JSX, add `<TaskFilterBar />` just before the task sections div (inside `<div className="px-4 py-6">`). Replace `tasks={todayTasks}` with `tasks={filteredToday}` and `tasks={backlogTasks}` with `tasks={filteredBacklog}`. Update `count` props accordingly. The `done` section stays unfiltered.

The updated task sections div:

```tsx
<div className="px-4 py-6">
  <TaskFilterBar
    allTasks={allTasks}
    activePriorities={activePriorities}
    activeTags={activeTags}
    onTogglePriority={togglePriority}
    onToggleTag={toggleTag}
    onClear={() => { setActivePriorities(new Set()); setActiveTags(new Set()); }}
  />
  <TaskSection
    title={t('tasks.today')}
    count={filteredToday.length}
    tasks={filteredToday}
    variant="default"
    onTaskCreated={handleCreate}
    onToggle={handleToggle}
    onEditFull={handleEditFull}
    onDelete={handleDelete}
  />
  <TaskSection
    title={t('tasks.backlog')}
    count={filteredBacklog.length}
    tasks={filteredBacklog}
    variant="backlog"
    onTaskCreated={handleCreate}
    onToggle={handleToggle}
    onEditFull={handleEditFull}
    onDelete={handleDelete}
  />
  <TaskSection
    title={t('tasks.done')}
    count={counts.done}
    tasks={doneTasks}
    variant="done"
    onTaskCreated={handleCreate}
    onToggle={handleToggle}
    onEditFull={handleEditFull}
    onDelete={handleDelete}
  />
</div>
```

- [ ] **Step 3: TypeScript check**

```bash
cd apps/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/routes/today/index.tsx
git commit -m "feat: filter bar on /today page"
```

---

## Self-Review

**Spec coverage:**
- ✅ `filterTasks` utility with AND logic (Task 1)
- ✅ `clearFilters` i18n key in EN + CS (Task 2)
- ✅ `TaskFilterBar` with priority pills (green/amber/red) + tag pills + Clear button (Task 3)
- ✅ Filter bar on `/tasks` — all 5 sections filtered, counts updated (Task 4)
- ✅ Filter bar on `/today` — today + backlog filtered, done unfiltered (Task 5)
- ✅ Tags derived from unfiltered task list (allTasks passed to TaskFilterBar)
- ✅ Bar hidden when no tasks have priority or tags

**Placeholder scan:** None found.

**Type consistency:** `Priority = 'LOW' | 'MEDIUM' | 'HIGH'` used consistently across all tasks. `filterTasks(tasks, Set<Priority>, Set<string>)` signature matches usage in Tasks 4 and 5. `TaskFilterBar` props match the render calls.
