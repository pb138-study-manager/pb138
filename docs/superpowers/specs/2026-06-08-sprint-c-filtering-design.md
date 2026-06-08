# Sprint C — Task Filtering by Priority and Tag

**Date:** 2026-06-08
**Scope:** Filter tasks by priority (Low/Medium/High) and user-defined tags on both `/tasks` and `/today` pages. Client-side only — no backend changes needed. AND logic: a task must match all active filters.

---

## Architecture

Filter state lives in the page component (`TasksPage`, `TodayPage`). The hooks (`useTasksManager`, `useTodayManager`) remain unchanged — they return the full unfiltered task lists as before. A new `filterTasks()` utility applies AND logic, and a new `TaskFilterBar` component renders the filter UI.

No backend, no new API endpoints, no schema changes.

---

## New Utility — `filterTasks`

**File:** `apps/frontend/src/lib/task-utils.ts` (add to existing file)

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

---

## New Component — `TaskFilterBar`

**File:** `apps/frontend/src/components/tasks/task-filter-bar.tsx`

Props:
```typescript
{
  allTasks: Task[];                                          // unfiltered list — source of tag pills
  activePriorities: Set<'LOW' | 'MEDIUM' | 'HIGH'>;
  activeTags: Set<string>;
  onTogglePriority: (p: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}
```

Renders:
- Priority pills — always shown: Low (green), Medium (amber), High (red). Active = filled background, inactive = outline/ghost.
- Tag pills — derived from `allTasks`: collect all unique tags across all tasks in the list. Shown only if at least one task has tags. Same toggle style as priority pills.
- "Clear" button — visible only when `activePriorities.size > 0 || activeTags.size > 0`. Resets all filters.
- If no tasks have any priority or tags at all, the filter bar is not rendered.

Pill colors:
- Priority LOW active: `bg-green-100 text-green-700 border-green-300`
- Priority MEDIUM active: `bg-amber-100 text-amber-700 border-amber-300`
- Priority HIGH active: `bg-red-100 text-red-700 border-red-300`
- Tag active: `bg-indigo-100 text-indigo-700 border-indigo-300`
- Any inactive: `bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-600`

---

## Pages

### `/tasks` — `apps/frontend/src/routes/tasks/index.tsx`

Add filter state:
```typescript
const [activePriorities, setActivePriorities] = useState<Set<'LOW' | 'MEDIUM' | 'HIGH'>>(new Set());
const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
```

Derive `allTasks` (union of all sections, for tag source):
```typescript
const allTasks = [...overdue, ...today, ...thisWeek, ...later, ...done];
```

Apply filter to each section before passing to `TaskSection`:
```typescript
const filtered = {
  overdue: filterTasks(overdue, activePriorities, activeTags),
  today:   filterTasks(today,   activePriorities, activeTags),
  thisWeek: filterTasks(thisWeek, activePriorities, activeTags),
  later:   filterTasks(later,   activePriorities, activeTags),
  done:    filterTasks(done,    activePriorities, activeTags),
};
```

Render `TaskFilterBar` above the task sections, inside the existing layout.

### `/today` — `apps/frontend/src/routes/today/index.tsx`

Same filter state. Apply to `todayTasks` and `backlogTasks` before passing to `TaskSection`. `doneTasks` section is not filtered (completed tasks are not affected).

`allTasks` for tag source = `[...todayTasks, ...backlogTasks, ...doneTasks]` (unfiltered, from hook output).

---

## i18n

Add to both `en.json` and `cs.json` under `"tasks"`:

```json
"filterByPriority": "Priority",
"filterByTag": "Tag",
"clearFilters": "Clear"
```

Czech:
```json
"filterByPriority": "Priorita",
"filterByTag": "Štítek",
"clearFilters": "Zrušit"
```

---

## Affected Files

| File | Change |
|---|---|
| `apps/frontend/src/lib/task-utils.ts` | Add `filterTasks()` |
| `apps/frontend/src/components/tasks/task-filter-bar.tsx` | New component |
| `apps/frontend/src/routes/tasks/index.tsx` | Filter state + `TaskFilterBar` + filtered task sections |
| `apps/frontend/src/routes/today/index.tsx` | Same |
| `apps/frontend/src/locales/en.json` | 3 i18n keys |
| `apps/frontend/src/locales/cs.json` | Same in Czech |

---

## Out of Scope

- Persisting filters across navigation (localStorage) — not needed for demo
- Filtering on `/today` done section
- URL query params for filter state
- Filter count badge on the filter bar
