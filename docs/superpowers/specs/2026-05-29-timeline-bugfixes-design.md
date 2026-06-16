# Timeline Bug Fixes — Design Spec

**Date:** 2026-05-29  
**Tickets:** KAN-75 (Deadlines time not working), KAN-76 (Timeline not sorted)  
**Scope:** `apps/frontend/src/hooks/useTimelineManager.ts` only

---

## KAN-75 — Deadlines not showing

### Root cause

`allEvents` is assembled as:

```ts
const allEvents = [
  ...events.filter((e) => e.type !== 'DEADLINE'),
  ...deadlineEvents, // synthetic events built from task.assignmentDeadline
];
```

This filters out all real DEADLINE events from the API. The synthetic replacement (`deadlineEvents`) only covers assignment deadlines via `task.assignmentDeadline`. Manual DEADLINE events created by the user through the UI are permanently invisible.

The backend already creates real DEADLINE events in the `events` table for each enrolled student when an assignment is created (`courses.ts` — `tx.insert(events)`). The synthetic fallback is therefore redundant.

### Fix

Remove the DEADLINE filter and the synthetic `deadlineEvents` construction entirely:

```ts
const allEvents = events; // all event types, including DEADLINE
```

---

## KAN-76 — Timeline not updating on week navigation

### Root cause

`prevWeek()` and `nextWeek()` update only `weekStart` state. `selectedDate` stays in the old week. Since `eventsForSelectedDate` and `tasksForSelectedDate` both filter by `isSameDay(..., selectedDate)`, navigating to a new week renders an empty timeline — no day is highlighted in the strip, no events load until the user manually clicks a day.

### Fix

Shift `selectedDate` by ±7 days in tandem with `weekStart` inside both navigation functions:

```ts
function prevWeek() {
  setWeekStart((prev) => {
    const d = new Date(prev);
    d.setDate(d.getDate() - 7);
    return d;
  });
  setSelectedDate((prev) => {
    const d = new Date(prev);
    d.setDate(d.getDate() - 7);
    return d;
  });
}
function nextWeek() {
  setWeekStart((prev) => {
    const d = new Date(prev);
    d.setDate(d.getDate() + 7);
    return d;
  });
  setSelectedDate((prev) => {
    const d = new Date(prev);
    d.setDate(d.getDate() + 7);
    return d;
  });
}
```

This preserves which day-of-week the user was viewing and immediately loads that day's events in the new week.

---

## Files changed

| File                                            | Change                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `apps/frontend/src/hooks/useTimelineManager.ts` | Remove `deadlineEvents` + DEADLINE filter; fix `prevWeek`/`nextWeek` |

No backend changes. No other frontend files.
