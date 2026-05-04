# Tasks Frontend ↔ Backend Connection Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded task data in the frontend with real API calls to the backend.

**Architecture:** The existing `api` client in `lib/api.ts` already handles auth headers and fetch — we just call it from the tasks page. The page fetches tasks on mount, splits them into today/backlog/done buckets, and passes mutation callbacks down to child components. No new files needed — only the three existing task components and the page are modified.

**Tech Stack:** React (useState, useEffect), TanStack Router, existing `api` client (`lib/api.ts`), TypeScript

---

## File Map

| File | Change |
|---|---|
| `apps/frontend/src/routes/tasks/index.tsx` | Replace hardcoded data with `useEffect` fetch; add create + toggle handlers |
| `apps/frontend/src/components/tasks/tasks-section.tsx` | Accept and forward `onTaskCreated` callback to `NewTaskDialog` |
| `apps/frontend/src/components/tasks/new-tasks-dialog.tsx` | Accept `onSubmit` prop; wire submit button to call API |
| `apps/frontend/src/components/tasks/tasks-card.tsx` | Accept `onToggle` prop; wire checkbox to call it |

---

## Task 1: Fetch tasks from backend

**Files:**
- Modify: `apps/frontend/src/routes/tasks/index.tsx`

The page currently has hardcoded `TASKS_DATA` and `FEATURED_TASKS`. We replace them with a real fetch.

**Splitting logic:**
- `done` — `status === 'DONE'`
- `today` — `status !== 'DONE'` and `dueDate` is today or earlier
- `backlog` — `status !== 'DONE'` and `dueDate` is tomorrow or later

- [ ] **Step 1: Open the file**

Open `apps/frontend/src/routes/tasks/index.tsx`.

- [ ] **Step 2: Replace the top of the file with this**

Replace everything from the imports through the end of `TASKS_DATA` (lines 1–128) with:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Task, TaskStatus } from '@/types';
import BottomNav from '@/components/ui/bottom-nav';
import TaskSection from '@/components/tasks/tasks-section';
import TaskSidebar from '@/components/tasks/tasks-sidebar';
import { api } from '@/lib/api';

export const Route = createFileRoute('/tasks/')({
  component: TasksPage,
});

function splitTasks(tasks: Task[]) {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const today: Task[] = [];
  const backlog: Task[] = [];
  const done: Task[] = [];

  for (const task of tasks) {
    if (task.status === 'DONE') {
      done.push(task);
    } else if (new Date(task.dueDate) <= todayEnd) {
      today.push(task);
    } else {
      backlog.push(task);
    }
  }

  return { today, backlog, done };
}
```

- [ ] **Step 3: Replace the `TasksPage` function with this**

Replace the existing `TasksPage` function (lines 130–181) with:

```tsx
export function TasksPage() {
  const [activeFilter, setActiveFilter] = useState('today');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Task[]>('/tasks')
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { today, backlog, done } = splitTasks(tasks);

  const counts = {
    today: today.length,
    backlog: backlog.length,
    done: done.length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-8">
          <TaskSidebar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
          />
          <div className="flex-1" />
        </div>

        <div>
          <TaskSection
            title="Today"
            count={counts.today}
            tasks={today}
            variant="default"
          />
          <TaskSection
            title="Backlog"
            count={counts.backlog}
            tasks={backlog}
            variant="backlog"
          />
          <TaskSection
            title="Done"
            count={counts.done}
            tasks={done}
            variant="done"
          />
        </div>
      </div>

      <BottomNav active="tasks" />
    </div>
  );
}
```

- [ ] **Step 4: Start the dev server and open the tasks page**

```bash
pnpm --filter @pb138/frontend dev
```

Open `http://localhost:5173/tasks`. You should see "Loading tasks..." briefly then either an empty list (if no tasks in DB yet) or real tasks. No more hardcoded "Task..." placeholders.

> If you see an error about auth, make sure you're logged in and the token is in localStorage — open DevTools → Application → Local Storage → check for `token`.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/routes/tasks/index.tsx
git commit -m "feat: fetch tasks from backend in tasks page"
```

---

## Task 2: Wire up task creation

**Files:**
- Modify: `apps/frontend/src/components/tasks/new-tasks-dialog.tsx`
- Modify: `apps/frontend/src/components/tasks/tasks-section.tsx`
- Modify: `apps/frontend/src/routes/tasks/index.tsx`

The dialog already has the form (name + date picker) but the submit button does nothing. We add an `onSubmit` prop that the page provides.

- [ ] **Step 1: Update `NewTaskDialog` to accept and call `onSubmit`**

Open `apps/frontend/src/components/tasks/new-tasks-dialog.tsx`.

Replace the component signature and add the submit handler:

```tsx
import { useState } from 'react';
import { Calendar, Tag, Flag, BookOpen, CheckSquare, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from './date-picker-dialog';

export default function NewTaskDialog({
  isOpen,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, dueDate: string) => Promise<void>;
}) {
  const [taskName, setTaskName] = useState('');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  const taskOptions = [
    { icon: Calendar, label: 'Date' },
    { icon: Tag, label: 'Tags' },
    { icon: Flag, label: 'Priority' },
    { icon: BookOpen, label: 'Course' },
    { icon: CheckSquare, label: 'Subtasks' },
  ];

  async function handleSubmit() {
    if (!taskName.trim() || !selectedDate) return;
    setSaving(true);
    try {
      await onSubmit(taskName.trim(), selectedDate.toISOString());
      setTaskName('');
      setSelectedDate(null);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="hidden">Create Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Input
            placeholder="Task name..."
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            className="text-lg font-semibold border-none border-b rounded-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-gray-400"
          />
          <div className="border-t" />
          <div className="flex flex-wrap gap-2">
            {taskOptions.map((option) => {
              if (option.label === 'Date') {
                const hasDate = selectedDate !== null;
                return (
                  <Button
                    key={option.label}
                    onClick={() => setIsDateOpen(true)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors text-sm font-medium ${
                      hasDate
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <option.icon className="w-4 h-4" />
                    {hasDate ? selectedDate.toLocaleDateString() : option.label}
                  </Button>
                );
              }
              return (
                <Button
                  key={option.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700"
                >
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSubmit}
            disabled={!taskName.trim() || !selectedDate || saving}
            className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            <ChevronUp className="w-6 h-6" />
          </Button>
        </div>
      </DialogContent>

      <DatePickerDialog
        isOpen={isDateOpen}
        onOpenChange={setIsDateOpen}
        currentDate={selectedDate}
        onDateSelect={setSelectedDate}
      />
    </Dialog>
  );
}
```

- [ ] **Step 2: Update `TaskSection` to accept and forward `onTaskCreated`**

Open `apps/frontend/src/components/tasks/tasks-section.tsx`.

Replace the whole file with:

```tsx
import { useState } from 'react';
import { Star, Package, ClipboardCheck, Plus } from 'lucide-react';
import { Task } from '@/types';
import { Button } from '@/components/ui/button';
import NewTaskDialog from './new-tasks-dialog';
import TaskCard from './tasks-card';

export default function TaskSection({
  title,
  count,
  tasks,
  variant = 'default',
  onTaskCreated,
  onToggle,
}: {
  title: string;
  count: number;
  tasks: Task[];
  variant?: 'default' | 'backlog' | 'done';
  onTaskCreated: (title: string, dueDate: string) => Promise<void>;
  onToggle: (id: number) => Promise<void>;
}) {
  const icons = {
    default: <Star height={25} />,
    backlog: <Package height={25} />,
    done: <ClipboardCheck height={25} />,
  };

  const colors = {
    default: 'text-gray-900',
    backlog: 'text-orange-500',
    done: 'text-green-600',
  };

  const [openCreateTaskDialog, setOpenCreateTaskDialog] = useState(false);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`ml-4 flex items-center gap-2 text-lg font-semibold ${colors[variant]}`}>
          <span className="mr-1">{icons[variant]}</span>
          <span>{title}</span>
          <span className="ml-1 text-gray-400 py-1 text-base font-medium">{count}</span>
        </h3>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full mr-3"
          onClick={() => setOpenCreateTaskDialog(true)}
        >
          <Plus className="h-8" />
        </Button>
      </div>
      <div>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onToggle={onToggle} />
        ))}
      </div>
      <NewTaskDialog
        isOpen={openCreateTaskDialog}
        onOpenChange={setOpenCreateTaskDialog}
        onSubmit={onTaskCreated}
      />
    </div>
  );
}
```

- [ ] **Step 3: Add `handleCreate` and `handleToggle` to `TasksPage`**

Open `apps/frontend/src/routes/tasks/index.tsx`.

Add `import { Task, TaskStatus } from '@/types';` at the top (if not already there — `TaskStatus` may not be needed here so just `Task` is fine).

Inside `TasksPage`, add these two handlers after the `useEffect`:

```tsx
  async function handleCreate(title: string, dueDate: string) {
    const newTask = await api.post<Task>('/tasks', { title, dueDate });
    setTasks(prev => [...prev, newTask]);
  }

  async function handleToggle(id: number) {
    const updated = await api.patch<Task>(`/tasks/${id}/toggle-done`, {});
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  }
```

Then update the three `<TaskSection>` calls to pass the new props:

```tsx
          <TaskSection
            title="Today"
            count={counts.today}
            tasks={today}
            variant="default"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
          />
          <TaskSection
            title="Backlog"
            count={counts.backlog}
            tasks={backlog}
            variant="backlog"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
          />
          <TaskSection
            title="Done"
            count={counts.done}
            tasks={done}
            variant="done"
            onTaskCreated={handleCreate}
            onToggle={handleToggle}
          />
```

- [ ] **Step 4: Verify in browser**

With the dev server running, go to `/tasks`. Click the `+` button in any section. Fill in a task name and pick a date. Click the submit button (arrow up). The dialog should close and the new task should appear in the list without a page reload.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/routes/tasks/index.tsx \
        apps/frontend/src/components/tasks/tasks-section.tsx \
        apps/frontend/src/components/tasks/new-tasks-dialog.tsx
git commit -m "feat: wire up task creation to backend"
```

---

## Task 3: Wire up toggle done

**Files:**
- Modify: `apps/frontend/src/components/tasks/tasks-card.tsx`

The checkbox currently only flips local state. We need it to call `onToggle` (which was already wired up in Task 2).

- [ ] **Step 1: Update `TaskCard` to accept and call `onToggle`**

Open `apps/frontend/src/components/tasks/tasks-card.tsx`.

Replace the whole file with:

```tsx
import { useState } from 'react';
import { Clock, Users } from 'lucide-react';
import { Task } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';

export default function TaskCard({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (id: number) => Promise<void>;
}) {
  const [isChecked, setIsChecked] = useState(task.status === 'DONE');
  const [toggling, setToggling] = useState(false);

  const dueTime = `Due ${new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const subject = task.description || 'No description';
  const progress = task.status === 'DONE' ? 4 : task.status === 'IN PROGRESS' ? 2 : 1;
  const maxProgress = 4;
  const hasUsers = task.assignmentId !== null;
  const progressPercent = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    setIsChecked(prev => !prev); // optimistic
    try {
      await onToggle(task.id);
    } catch {
      setIsChecked(prev => !prev); // revert on error
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2 flex items-start gap-3 hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 truncate">{task.title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          {hasUsers && <Users className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
          <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500 truncate">
            {dueTime} · {subject}
          </p>
        </div>
        {maxProgress > 0 && (
          <div className="mt-1.5">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-blue-500 font-medium mt-0.5 block">
              {progress}/{maxProgress}
            </span>
          </div>
        )}
      </div>
      <div className="flex mt-5 items-center">
        <Checkbox
          checked={isChecked}
          onCheckedChange={handleToggle}
          disabled={toggling}
          className={`flex-shrink-0 w-7 h-7 rounded-full transition-all cursor-pointer ${
            isChecked
              ? 'bg-green-500 border-green-500'
              : 'bg-white border-gray-300 hover:border-gray-400'
          }`}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Go to `/tasks`. Click the checkbox on any task. The checkbox should immediately flip (optimistic update). Refresh the page — the task should still show the new state (persisted in DB). If you check a backlog task it will move to Done on the next fetch/refresh.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/tasks/tasks-card.tsx
git commit -m "feat: wire up toggle-done to backend"
```

---

## Done

After all 3 tasks:
- Tasks load from the backend on page open
- New tasks can be created via the dialog
- The checkbox persists done/undone state to the backend
