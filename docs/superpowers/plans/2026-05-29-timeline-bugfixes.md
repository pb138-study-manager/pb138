# Timeline Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two bugs in the Timeline page — DEADLINE events not showing (KAN-75) and the timeline not updating when navigating weeks (KAN-76).

**Architecture:** Both fixes are in `useTimelineManager.ts`. KAN-75: remove the synthetic `deadlineEvents` block and the `type !== 'DEADLINE'` filter — the backend already creates real DEADLINE events in the DB. KAN-76: shift `selectedDate` by ±7 days inside `prevWeek`/`nextWeek` so the displayed day follows the week navigation. Pure helper functions are extracted to a utility file so they can be unit-tested without a React environment.

**Tech Stack:** React 18, Vitest (jsdom), TypeScript. No new dependencies.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `apps/frontend/src/hooks/timeline-utils.ts` | Pure helpers extracted from hook: `getWeekStart`, `getWeekDates`, `isSameDay` |
| Create | `apps/frontend/src/hooks/timeline-utils.test.ts` | Unit tests for those helpers + navigation shift logic |
| Modify | `apps/frontend/src/hooks/useTimelineManager.ts` | Import from utils; remove `deadlineEvents`; fix `prevWeek`/`nextWeek` |

---

## Task 1: Extract pure helpers to `timeline-utils.ts`

**Files:**
- Create: `apps/frontend/src/hooks/timeline-utils.ts`

- [ ] **Step 1: Create the utility file**

```ts
// apps/frontend/src/hooks/timeline-utils.ts

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function shiftDate(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/hooks/timeline-utils.ts
git commit -m "feat: extract timeline pure helpers to timeline-utils.ts"
```

---

## Task 2: Write and run tests for the helpers (TDD — write before fixing the hook)

**Files:**
- Create: `apps/frontend/src/hooks/timeline-utils.test.ts`

- [ ] **Step 1: Write the test file**

```ts
// apps/frontend/src/hooks/timeline-utils.test.ts
import { describe, it, expect } from 'vitest';
import { getWeekStart, getWeekDates, isSameDay, shiftDate } from './timeline-utils';

describe('getWeekStart', () => {
  it('returns Monday for a Thursday', () => {
    const thu = new Date(2026, 4, 28); // Thu May 28 2026
    const result = getWeekStart(thu);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(25); // May 25
  });

  it('returns Monday for a Monday', () => {
    const mon = new Date(2026, 4, 25); // Mon May 25 2026
    expect(getWeekStart(mon).getDate()).toBe(25);
  });

  it('returns the previous Monday for a Sunday', () => {
    const sun = new Date(2026, 4, 31); // Sun May 31 2026
    const result = getWeekStart(sun);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(25); // Mon May 25
  });
});

describe('getWeekDates', () => {
  it('returns 7 consecutive days starting from Monday', () => {
    const mon = new Date(2026, 4, 25);
    mon.setHours(0, 0, 0, 0);
    const dates = getWeekDates(mon);
    expect(dates).toHaveLength(7);
    expect(dates[0].getDate()).toBe(25); // Mon
    expect(dates[6].getDate()).toBe(31); // Sun
  });
});

describe('isSameDay', () => {
  it('returns true for same calendar day, different times', () => {
    const a = new Date(2026, 4, 29, 9, 0);
    const b = new Date(2026, 4, 29, 23, 59);
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for different days', () => {
    const a = new Date(2026, 4, 29);
    const b = new Date(2026, 4, 30);
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('shiftDate', () => {
  it('shifts forward 7 days (next week navigation)', () => {
    const thu = new Date(2026, 4, 28); // Thu May 28
    const result = shiftDate(thu, 7);
    expect(result.getDate()).toBe(4);   // Thu June 4
    expect(result.getMonth()).toBe(5);  // June
  });

  it('shifts backward 7 days (prev week navigation)', () => {
    const thu = new Date(2026, 4, 28); // Thu May 28
    const result = shiftDate(thu, -7);
    expect(result.getDate()).toBe(21);  // Thu May 21
  });

  it('does not mutate the original date', () => {
    const original = new Date(2026, 4, 28);
    shiftDate(original, 7);
    expect(original.getDate()).toBe(28);
  });
});
```

- [ ] **Step 2: Run tests — expect all to pass**

```bash
pnpm --filter @pb138/frontend test
```

Expected output: all tests in `timeline-utils.test.ts` pass. If any fail, fix the utility functions before proceeding.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/hooks/timeline-utils.test.ts
git commit -m "test: add unit tests for timeline-utils helpers"
```

---

## Task 3: Fix KAN-75 — remove DEADLINE filter and synthetic deadlineEvents

**Files:**
- Modify: `apps/frontend/src/hooks/useTimelineManager.ts`

The backend already inserts a real DEADLINE event for every student when an assignment is created (`courses.ts` — `tx.insert(events)` with `type: 'DEADLINE'`). The synthetic generation is redundant and causes two problems: manually-created DEADLINE events are thrown away, and assignment deadlines are duplicated as fake events with negative IDs.

- [ ] **Step 1: Replace the top of `useTimelineManager.ts` with the import and remove `deadlineEvents`**

Open `apps/frontend/src/hooks/useTimelineManager.ts`. Make the following changes:

**Add import at the top** (after existing imports):
```ts
import { getWeekStart, getWeekDates, isSameDay, shiftDate } from './timeline-utils';
```

**Remove** the local function definitions for `getWeekStart`, `getWeekDates`, `isSameDay` (lines 6–28 — the three functions defined before the hook). They are now in `timeline-utils.ts`.

**Remove** the entire `deadlineEvents` block (lines 51–78 in the original file):
```ts
// DELETE everything from here:
  // Synthetic deadline events derived from assignment tasks — one per unique assignment deadline per day
  const deadlineEvents: Event[] = (() => {
    ...
  })();

  const allEvents = [
    ...events.filter((e) => e.type !== 'DEADLINE'),
    ...deadlineEvents,
  ];
// to here (inclusive)
```

**Replace with:**
```ts
  const allEvents = events;
```

The full changed section should look like this after the edit:
```ts
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').catch(() => []),
  });

  const allEvents = events;

  const eventsForSelectedDate = allEvents.filter((e) =>
    isSameDay(new Date(e.startDate), selectedDate)
  );
```

- [ ] **Step 2: Run tests to make sure nothing broke**

```bash
pnpm --filter @pb138/frontend test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/hooks/useTimelineManager.ts
git commit -m "fix: show real DEADLINE events from API instead of synthetic ones (KAN-75)"
```

---

## Task 4: Fix KAN-76 — shift selectedDate with week navigation

**Files:**
- Modify: `apps/frontend/src/hooks/useTimelineManager.ts`

`prevWeek()` and `nextWeek()` currently only update `weekStart`. `selectedDate` stays in the old week, so `eventsForSelectedDate` returns nothing and no day is highlighted in the strip.

- [ ] **Step 1: Replace `prevWeek` and `nextWeek` in `useTimelineManager.ts`**

Find and replace the `prevWeek` function:

**Before:**
```ts
  function prevWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }
```

**After:**
```ts
  function prevWeek() {
    setWeekStart((prev) => shiftDate(prev, -7));
    setSelectedDate((prev) => shiftDate(prev, -7));
  }
```

Find and replace the `nextWeek` function:

**Before:**
```ts
  function nextWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }
```

**After:**
```ts
  function nextWeek() {
    setWeekStart((prev) => shiftDate(prev, 7));
    setSelectedDate((prev) => shiftDate(prev, 7));
  }
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @pb138/frontend test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/hooks/useTimelineManager.ts
git commit -m "fix: sync selectedDate with week navigation in timeline (KAN-76)"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Start the frontend dev server**

```bash
pnpm --filter @pb138/frontend dev
```

Open http://localhost:5173 and navigate to `/timeline`.

- [ ] **Step 2: Verify KAN-76 fix**

1. Note which day is selected (highlighted in the strip).
2. Click the `›` (next week) arrow.
3. The same day-of-week in the new week should now be highlighted, and any events/tasks for that day should appear immediately — without needing to click a day.
4. Click `‹` (previous week) — same behaviour back.

- [ ] **Step 3: Verify KAN-75 fix**

1. Click `+` to add a new event.
2. Select type **Deadline**, enter a title, set a date and time, save.
3. Navigate to that day in the strip — the deadline should appear in the timeline list with a red indicator.
4. Previously, this deadline would have been invisible. Now it shows.

- [ ] **Step 4: Final commit if any manual fixes were needed, otherwise done**