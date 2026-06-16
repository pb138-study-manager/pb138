# Sprint A — Quick Fixes Design

**Date:** 2026-06-08  
**Scope:** Pure-frontend bug fixes and UX improvements with no new backend routes required.

---

## 1. Today Page — Hardcoded Slovak Strings

### Problem

`routes/today/index.tsx` has two hardcoded Slovak strings that never change regardless of language setting:

- `getGreeting()` returns `'Dobré ráno'` / `'Dobrý deň'` / `'Dobrý večer'`
- Progress subtitle: `"{counts.done} z {todayTotal} úloh hotových dnes"`

### Fix

Add i18n keys to `en.json` and `cs.json`:

```json
"today": {
  "greetingMorning": "Good morning",
  "greetingAfternoon": "Good afternoon",
  "greetingEvening": "Good evening",
  "progress": "{{done}} of {{total}} tasks done today"
}
```

Replace `getGreeting()` with `t()` based on hour, replace the hardcoded progress string with `t('today.progress', { done: counts.done, total: todayTotal })`.

---

## 2. New Task Defaults to Today's Date

### Problem

`new-tasks-dialog.tsx` initializes `selectedDate` as `null`, so the Date pill shows "Date" and users must always manually pick a date.

### Fix

Initialize to today: `useState<Date>(() => new Date())`. The pill immediately shows today's date. User can still change or clear it.

Apply the same default to `NewEventDialog` (`startDate` in `components/timeline/NewEventDialog.tsx`).

---

## 3. Allow Task Creation Without a Date

### Problem

The submit button is disabled and `handleSubmit` returns early when `!selectedDate`. The backend already accepts `dueDate: null`.

### Fix

- Remove `!selectedDate` from `handleSubmit` guard and the button `disabled` check — only `taskName.trim()` required
- Change `onSubmit` prop signature: `dueDate: string` → `dueDate: string | null`
- Pass `selectedDate?.toISOString() ?? null` in the submit call
- Update `handleCreate` in `useTodayManager.ts` and `useTasksManager.ts` to accept `dueDate: string | null` and pass it to `api.post('/tasks', { ..., dueDate })`

---

## 4. "No date" Badge on Tasks Without a Due Date

### Problem

`getCountdown(null)` returns `''`, so tasks without a date show no countdown badge — visually inconsistent with tasks that have one.

### Fix

- In `task-utils.ts`, change the null/undefined branch of `getCountdown` to return `t`-ready sentinel, or simply return the string `'No date'`
- Since `getCountdown` is a pure util (not a hook), pass `noDate` as a parameter: `getCountdown(dueDate, noDateLabel: string)` where the caller supplies `t('tasks.noDate')`
- Add `"noDate": "No date"` to the `tasks` section of both locale files
- In `tasks-card.tsx`, render the countdown badge for all tasks (including no-date ones), using the neutral gray style for `'No date'`

---

## Affected Files

| File                                     | Change                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------- |
| `routes/today/index.tsx`                 | Replace hardcoded Slovak greeting + progress text with `t()`                              |
| `locales/en.json`                        | Add `today.greetingMorning/Afternoon/Evening`, `today.progress`, `tasks.noDate`           |
| `locales/cs.json`                        | Same keys in Czech/Slovak                                                                 |
| `components/tasks/new-tasks-dialog.tsx`  | Default `selectedDate` to `new Date()`, remove `!selectedDate` guards, allow null dueDate |
| `components/timeline/NewEventDialog.tsx` | Default `startDate` to `new Date()`                                                       |
| `hooks/useTodayManager.ts`               | Accept `dueDate: string                                                                   | null`in`handleCreate` |
| `hooks/useTasksManager.ts`               | Accept `dueDate: string                                                                   | null`in`handleCreate` |
| `lib/task-utils.ts`                      | `getCountdown` accepts optional `noDateLabel` param; returns it for null input            |
| `lib/task-utils.test.ts`                 | Update tests for new `getCountdown` signature                                             |
| `components/tasks/tasks-card.tsx`        | Pass `t('tasks.noDate')` to `getCountdown`; always render countdown badge                 |

---

## Out of Scope

- Tags and Priority (Sprint B)
- Markdown in notes or AI (Sprint C/D)
- Any backend schema changes
