# Sprint B — Tags & Priority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `priority` (LOW/MEDIUM/HIGH) and custom user-defined `tags` to tasks — stored in PostgreSQL, accepted/returned by the API, and editable via interactive pills in both create and edit dialogs.

**Architecture:** Schema-first (add enum + columns → `db:push`) → backend validation + persistence → frontend type → i18n → dialog UI → hooks wiring → card display.

**Tech Stack:** Drizzle ORM (pgEnum, text array), ElysiaJS + Zod, React 18, react-i18next, Tailwind CSS

---

## File Map

| File | Change |
|---|---|
| `apps/backend/src/db/schema.ts` | Add `taskPriorityEnum`, `priority` + `tags` columns to `tasks` |
| `apps/backend/src/routes/tasks.ts` | Add `priority` + `tags` to `CreateTaskSchema`, `UpdateTaskSchema`, INSERT, PATCH |
| `apps/frontend/src/types/index.ts` | Add `priority` + `tags` to `Task` interface |
| `apps/frontend/src/locales/en.json` | Add 6 priority/tags keys |
| `apps/frontend/src/locales/cs.json` | Same in Czech |
| `apps/frontend/src/components/tasks/new-tasks-dialog.tsx` | Working priority + tags pill UI; updated `onSubmit` prop type |
| `apps/frontend/src/components/tasks/edit-task-dialog.tsx` | Same UI pre-populated; updated `onSave` prop type |
| `apps/frontend/src/components/tasks/tasks-card.tsx` | Show priority badge + tag chips; updated `EditData` type |
| `apps/frontend/src/components/tasks/tasks-section.tsx` | Updated `onTaskCreated` prop type |
| `apps/frontend/src/hooks/useTasksManager.ts` | Pass `priority` + `tags` in `handleCreate` + `handleEditFull` |
| `apps/frontend/src/hooks/useTodayManager.ts` | Pass `priority` + `tags` in `handleCreate` |

---

### Task 1: Backend schema — add priority enum and columns

**Files:**
- Modify: `apps/backend/src/db/schema.ts`

- [ ] **Step 1: Add the enum and columns**

In `apps/backend/src/db/schema.ts`, add after the existing enums (line ~24, after `evalTypeEnum`):

```typescript
export const taskPriorityEnum = pgEnum('task_priority', ['LOW', 'MEDIUM', 'HIGH']);
```

Then in the `tasks` table definition (currently ends at `deletedAt`), add two columns before `deletedAt`:

```typescript
priority: taskPriorityEnum('priority'),
tags: text('tags').array().notNull().default([]),
```

The full `tasks` table should look like:

```typescript
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  assignmentId: integer('assignment_id').references(() => assignments.id),
  courseId: integer('course_id').references(() => courses.id),
  parentId: integer('parent_id').references((): AnyPgColumn => tasks.id),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: timestamp('due_date'),
  status: taskStatusEnum('status').notNull().default('TODO'),
  priority: taskPriorityEnum('priority'),
  tags: text('tags').array().notNull().default([]),
  deletedAt: timestamp('deleted_at'),
});
```

- [ ] **Step 2: Push schema to database**

```bash
cd apps/backend && bun run db:push
```

Expected: prompts confirming new enum + 2 columns on `tasks`, no data loss warnings.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/db/schema.ts
git commit -m "feat: add priority enum and tags array columns to tasks schema"
```

---

### Task 2: Backend API — accept and return priority + tags

**Files:**
- Modify: `apps/backend/src/routes/tasks.ts`

- [ ] **Step 1: Update CreateTaskSchema**

Replace the current `CreateTaskSchema` (lines 15–22):

```typescript
const CreateTaskSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  assignmentId: z.number().optional(),
  parentId: z.number().optional(),
  courseId: z.number().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});
```

- [ ] **Step 2: Update UpdateTaskSchema**

Replace the current `UpdateTaskSchema` (lines 24–30):

```typescript
const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['TODO', 'IN PROGRESS', 'DONE']).optional(),
  parentId: z.number().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});
```

- [ ] **Step 3: Pass priority + tags in INSERT**

In the `POST /` handler, update `.values(...)` (currently lines 103–111):

```typescript
.values({
  userId: (user as AuthUser).id,
  title: body.title,
  ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
  description: body.description,
  assignmentId: body.assignmentId,
  parentId: body.parentId,
  courseId: body.courseId,
  ...(body.priority !== undefined && { priority: body.priority }),
  ...(body.tags !== undefined && { tags: body.tags }),
})
```

- [ ] **Step 4: Pass priority + tags in PATCH**

In the `PATCH /:id` handler, update `.set(...)` (currently lines 174–182):

```typescript
.set({
  ...(body.title !== undefined && { title: body.title }),
  ...(body.description !== undefined && { description: body.description }),
  ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
  ...(body.status !== undefined && { status: body.status }),
  ...('parentId' in body && { parentId: body.parentId }),
  ...('priority' in body && { priority: body.priority ?? null }),
  ...(body.tags !== undefined && { tags: body.tags }),
})
```

- [ ] **Step 5: Verify GET returns priority + tags**

The `GET /` handler uses `db.select({...})` with explicit columns (lines 43–56). Add `priority` and `tags` to the select object:

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
  })
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/routes/tasks.ts
git commit -m "feat: accept and return priority and tags in tasks API"
```

---

### Task 3: Frontend types — add priority and tags to Task

**Files:**
- Modify: `apps/frontend/src/types/index.ts`

- [ ] **Step 1: Update Task interface**

In `apps/frontend/src/types/index.ts`, add two fields to the `Task` interface after `doneSubtaskCount`:

```typescript
export interface Task {
  id: number;
  userId: number;
  assignmentId: number | null;
  courseId: number | null;
  parentId: number | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  assignmentDeadline?: string | null;
  status: TaskStatus;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  tags?: string[];
  deletedAt: string | null;
  subtasks?: Task[];
  subtaskCount?: number;
  doneSubtaskCount?: number;
  eval?: Eval;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/types/index.ts
git commit -m "feat: add priority and tags fields to Task type"
```

---

### Task 4: i18n — add priority and tags translation keys

**Files:**
- Modify: `apps/frontend/src/locales/en.json`
- Modify: `apps/frontend/src/locales/cs.json`

- [ ] **Step 1: Add to en.json**

Inside the `"tasks"` object, add after `"total": "total"`:

```json
"priority": "Priority",
"priorityLow": "Low",
"priorityMedium": "Medium",
"priorityHigh": "High",
"tags": "Tags",
"addTag": "Add tag..."
```

- [ ] **Step 2: Add to cs.json**

Inside the `"tasks"` object, add after `"total": "celkom"`:

```json
"priority": "Priorita",
"priorityLow": "Nízká",
"priorityMedium": "Střední",
"priorityHigh": "Vysoká",
"tags": "Štítky",
"addTag": "Přidat štítek..."
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/locales/en.json apps/frontend/src/locales/cs.json
git commit -m "feat: add i18n keys for priority and tags"
```

---

### Task 5: NewTaskDialog — working priority + tags pills

**Files:**
- Modify: `apps/frontend/src/components/tasks/new-tasks-dialog.tsx`

- [ ] **Step 1: Add state and update onSubmit type**

Replace the entire file with the following (imports, state, logic, JSX):

```tsx
import { useState, useEffect, useRef } from 'react';
import { Calendar, Tag, Flag, BookOpen, ListChecks, ArrowUp, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import SubtasksDialog from '@/components/tasks/subtasks-dialog';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

interface Course { id: number; code: string; name: string | null; }

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | null;

const PRIORITY_CYCLE: Priority[] = [null, 'LOW', 'MEDIUM', 'HIGH'];

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
};

export default function NewTaskDialog({
  isOpen,
  onOpenChange,
  onSubmit,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    title: string,
    dueDate: string | undefined,
    subtasks: string[],
    description?: string,
    courseId?: number,
    priority?: Priority,
    tags?: string[]
  ) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [taskName, setTaskName] = useState('');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [priority, setPriority] = useState<Priority>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api.get<Course[]>('/courses/enrolled').then(setCourses).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (tagInputOpen) tagInputRef.current?.focus();
  }, [tagInputOpen]);

  function cyclePriority() {
    const idx = PRIORITY_CYCLE.indexOf(priority);
    setPriority(PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]);
  }

  function addTag(value: string) {
    const trimmed = value.trim();
    if (!trimmed || tags.length >= 20 || tags.includes(trimmed) || trimmed.length > 50) return;
    setTags((prev) => [...prev, trimmed]);
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    } else if (e.key === 'Escape') {
      setTagInputOpen(false);
      setTagInput('');
    }
  }

  async function handleSubmit() {
    if (!taskName.trim()) return;
    setSaving(true);
    try {
      await onSubmit(
        taskName.trim(),
        selectedDate?.toISOString() ?? undefined,
        subtasks,
        undefined,
        selectedCourse?.id,
        priority,
        tags
      );
      setTaskName('');
      setSelectedDate(new Date());
      setSubtasks([]);
      setSelectedCourse(null);
      setPriority(null);
      setTags([]);
      setTagInputOpen(false);
      setTagInput('');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const priorityLabel = priority
    ? t(`tasks.priority${priority.charAt(0) + priority.slice(1).toLowerCase()}`)
    : t('tasks.priority');

  const priorityClass = priority
    ? PRIORITY_STYLES[priority]
    : 'bg-gray-100 text-gray-600 hover:bg-gray-200';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader>
            <DialogTitle className="hidden">Create Task</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6 space-y-0">
            <Input
              placeholder="Task name..."
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              autoFocus
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-gray-400"
            />

            <div className="border-t" />

            <div className="flex flex-wrap gap-2 pt-4">
              {/* Date pill */}
              <button
                onClick={() => setIsDateOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  selectedDate ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {selectedDate ? selectedDate.toLocaleDateString() : 'Date'}
              </button>

              {/* Tags pill */}
              <button
                onClick={() => setTagInputOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  tags.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                {tags.length > 0 ? `${tags.length} ${t('tasks.tags')}` : t('tasks.tags')}
              </button>

              {/* Priority pill */}
              <button
                onClick={cyclePriority}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${priorityClass}`}
              >
                <Flag className="w-3.5 h-3.5" />
                {priorityLabel}
              </button>

              {/* Subtasks pill */}
              <button
                onClick={() => setIsSubtasksOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  subtasks.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                {subtasks.length > 0 ? `${subtasks.length} Subtask${subtasks.length > 1 ? 's' : ''}` : 'Subtasks'}
              </button>

              {/* Course dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                    selectedCourse ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {selectedCourse ? selectedCourse.code : 'Course'}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {courses.length === 0 ? (
                    <DropdownMenuItem disabled>No enrolled courses</DropdownMenuItem>
                  ) : (
                    courses.map((c) => (
                      <DropdownMenuItem
                        key={c.id}
                        onClick={() => setSelectedCourse(selectedCourse?.id === c.id ? null : c)}
                        className="flex items-center justify-between gap-4"
                      >
                        {c.code}
                        {selectedCourse?.id === c.id && <Check className="w-4 h-4 text-indigo-500" />}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tag input area */}
            {tagInputOpen && (
              <div className="pt-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
                    >
                      {tag}
                      <button onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                        <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                      </button>
                    </span>
                  ))}
                </div>
                <Input
                  ref={tagInputRef}
                  placeholder={t('tasks.addTag')}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    if (tagInput.trim()) addTag(tagInput);
                    setTagInput('');
                    setTagInputOpen(false);
                  }}
                  className="text-sm h-8"
                />
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!taskName.trim() || saving}
                className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-40 p-0"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DatePickerDialog
        isOpen={isDateOpen}
        onOpenChange={setIsDateOpen}
        currentDate={selectedDate}
        onDateSelect={setSelectedDate}
      />
      <SubtasksDialog
        isOpen={isSubtasksOpen}
        onOpenChange={setIsSubtasksOpen}
        subtasks={subtasks}
        onSubtasksChange={setSubtasks}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/tasks/new-tasks-dialog.tsx
git commit -m "feat: working priority and tags pills in NewTaskDialog"
```

---

### Task 6: Wire priority + tags through hooks and TaskSection

**Files:**
- Modify: `apps/frontend/src/hooks/useTasksManager.ts`
- Modify: `apps/frontend/src/hooks/useTodayManager.ts`
- Modify: `apps/frontend/src/components/tasks/tasks-section.tsx`

- [ ] **Step 1: Update useTasksManager.handleCreate**

In `apps/frontend/src/hooks/useTasksManager.ts`, replace `handleCreate` (lines 30–38):

```typescript
async function handleCreate(
  title: string,
  dueDate: string | undefined,
  subtaskTitles: string[] = [],
  description?: string,
  courseId?: number,
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null,
  tags?: string[]
) {
  const newTask = await api.post<Task>('/tasks', {
    title,
    dueDate,
    description,
    courseId,
    ...(priority != null && { priority }),
    ...(tags && tags.length > 0 && { tags }),
  });
  await Promise.all(
    subtaskTitles.map((subTitle) =>
      api.post<Task>('/tasks', { title: subTitle, dueDate, parentId: newTask.id })
    )
  );
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
}
```

- [ ] **Step 2: Update useTasksManager.handleEditFull**

In `apps/frontend/src/hooks/useTasksManager.ts`, replace `handleEditFull` (lines 47–63):

```typescript
async function handleEditFull(
  id: number,
  data: {
    title: string;
    dueDate: string;
    description?: string;
    status?: TaskStatus;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
    tags?: string[];
  },
  subtasksToAdd: string[],
  subtaskIdsToDelete: number[]
) {
  await Promise.all([
    api.patch<Task>(`/tasks/${id}`, data),
    ...subtaskIdsToDelete.map((subId) => api.delete(`/tasks/${subId}`)),
  ]);
  await Promise.all(
    subtasksToAdd.map((title) =>
      api.post<Task>('/tasks', { title, dueDate: data.dueDate, parentId: id })
    )
  );
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
}
```

- [ ] **Step 3: Update useTodayManager.handleCreate**

In `apps/frontend/src/hooks/useTodayManager.ts`, replace `handleCreate` (lines 50–58):

```typescript
async function handleCreate(
  title: string,
  dueDate: string | undefined,
  subtaskTitles: string[] = [],
  description?: string,
  courseId?: number,
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null,
  tags?: string[]
) {
  const newTask = await api.post<Task>('/tasks', {
    title,
    dueDate,
    description,
    courseId,
    ...(priority != null && { priority }),
    ...(tags && tags.length > 0 && { tags }),
  });
  await Promise.all(
    subtaskTitles.map((subTitle) =>
      api.post<Task>('/tasks', { title: subTitle, dueDate, parentId: newTask.id })
    )
  );
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
}
```

- [ ] **Step 4: Update TaskSection.onTaskCreated prop type**

In `apps/frontend/src/components/tasks/tasks-section.tsx`, update the `onTaskCreated` prop in the component props interface (line 26):

```typescript
onTaskCreated: (
  title: string,
  dueDate: string | undefined,
  subtasks: string[],
  description?: string,
  courseId?: number,
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null,
  tags?: string[]
) => Promise<void>;
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/hooks/useTasksManager.ts apps/frontend/src/hooks/useTodayManager.ts apps/frontend/src/components/tasks/tasks-section.tsx
git commit -m "feat: pass priority and tags through create/edit hooks and TaskSection"
```

---

### Task 7: EditTaskDialog — priority + tags UI, pre-populated

**Files:**
- Modify: `apps/frontend/src/components/tasks/edit-task-dialog.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import { useState, useEffect, useRef } from 'react';
import { Calendar, Tag, Flag, BookOpen, ListChecks, Plus, X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import { Task, TaskStatus } from '@/types';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

interface Course { id: number; code: string; name: string | null; }

type ExistingSub = { id: number; title: string };
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | null;

const PRIORITY_CYCLE: Priority[] = [null, 'LOW', 'MEDIUM', 'HIGH'];

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
};

export default function EditTaskDialog({
  task,
  isOpen,
  onOpenChange,
  onSave,
}: {
  task: Task;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    title: string;
    dueDate: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    tags?: string[];
    subtasksToAdd: string[];
    subtaskIdsToDelete: number[];
  }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const isSubtask = task.parentId !== null;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status] = useState<TaskStatus>(task.status);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    task.dueDate ? new Date(task.dueDate) : null
  );
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const [priority, setPriority] = useState<Priority>((task.priority as Priority) ?? null);
  const [tags, setTags] = useState<string[]>(task.tags ?? []);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [existingSubs, setExistingSubs] = useState<ExistingSub[]>([]);
  const [originalSubIds, setOriginalSubIds] = useState<number[]>([]);
  const [newSubTitles, setNewSubTitles] = useState<string[]>([]);
  const [newSubInput, setNewSubInput] = useState('');
  const [saving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!isOpen) { initializedRef.current = false; return; }
    setTitle(task.title);
    setDescription(task.description ?? '');
    setSelectedDate(task.dueDate ? new Date(task.dueDate) : null);
    setPriority((task.priority as Priority) ?? null);
    setTags(task.tags ?? []);
    setTagInputOpen(false);
    setTagInput('');
    setNewSubTitles([]);
    setNewSubInput('');
    setSubtasksExpanded(false);
    api.get<Course[]>('/courses/enrolled').then((all) => {
      setCourses(all);
      setSelectedCourse(task.courseId ? (all.find((c) => c.id === task.courseId) ?? null) : null);
    }).catch(() => {});

    if (!isSubtask) {
      api
        .get<Task & { subtasks: Task[] }>(`/tasks/${task.id}`)
        .then((data) => {
          const subs = (data.subtasks ?? []).map((s) => ({ id: s.id, title: s.title }));
          setExistingSubs(subs);
          setOriginalSubIds(subs.map((s) => s.id));
        })
        .catch(() => {});
    }
    setTimeout(() => { initializedRef.current = true; }, 100);
  }, [isOpen, task, isSubtask]);

  useEffect(() => {
    if (tagInputOpen) tagInputRef.current?.focus();
  }, [tagInputOpen]);

  const deletedSubIds = originalSubIds.filter((id) => !existingSubs.some((s) => s.id === id));
  const totalSubtasks = existingSubs.length + newSubTitles.length;

  useEffect(() => {
    if (!initializedRef.current || !title.trim() || !selectedDate) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSave({
        title: title.trim(),
        dueDate: selectedDate.toISOString(),
        description: description.trim() || undefined,
        status,
        priority,
        tags,
        subtasksToAdd: [],
        subtaskIdsToDelete: [],
      });
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, description, selectedDate, status, priority, tags, onSave]);

  function cyclePriority() {
    const idx = PRIORITY_CYCLE.indexOf(priority);
    setPriority(PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]);
  }

  function addTag(value: string) {
    const trimmed = value.trim();
    if (!trimmed || tags.length >= 20 || tags.includes(trimmed) || trimmed.length > 50) return;
    setTags((prev) => [...prev, trimmed]);
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    } else if (e.key === 'Escape') {
      setTagInputOpen(false);
      setTagInput('');
    }
  }

  function addNewSub() {
    if (!newSubInput.trim()) return;
    setNewSubTitles((prev) => [...prev, newSubInput.trim()]);
    setNewSubInput('');
  }

  async function saveSubtasks() {
    if (!title.trim() || !selectedDate || saving) return;
    await onSave({
      title: title.trim(),
      dueDate: selectedDate.toISOString(),
      description: description.trim() || undefined,
      status,
      priority,
      tags,
      subtasksToAdd: newSubTitles,
      subtaskIdsToDelete: deletedSubIds,
    });
    setNewSubTitles([]);
  }

  const priorityLabel = priority
    ? t(`tasks.priority${priority.charAt(0) + priority.slice(1).toLowerCase()}`)
    : t('tasks.priority');

  const priorityClass = priority
    ? PRIORITY_STYLES[priority]
    : 'bg-gray-100 text-gray-600 hover:bg-gray-200';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader>
            <DialogTitle className="hidden">Edit Task</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6 space-y-0">
            <Input
              placeholder="Task name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-gray-400"
            />

            <div className="border-t" />

            <div className="flex flex-wrap gap-2 pt-4">
              {/* Date pill */}
              <button
                onClick={() => setIsDateOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  selectedDate ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {selectedDate ? selectedDate.toLocaleDateString() : 'Date'}
              </button>

              {/* Tags pill */}
              <button
                onClick={() => setTagInputOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  tags.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                {tags.length > 0 ? `${tags.length} ${t('tasks.tags')}` : t('tasks.tags')}
              </button>

              {/* Priority pill */}
              <button
                onClick={cyclePriority}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${priorityClass}`}
              >
                <Flag className="w-3.5 h-3.5" />
                {priorityLabel}
              </button>

              {/* Subtasks pill */}
              {!isSubtask && (
                <button
                  onClick={() => setSubtasksExpanded((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                    totalSubtasks > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  {totalSubtasks > 0 ? `${totalSubtasks} Subtask${totalSubtasks > 1 ? 's' : ''}` : 'Subtasks'}
                </button>
              )}

              {/* Course dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                    selectedCourse ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {selectedCourse ? selectedCourse.code : 'Course'}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {courses.length === 0 ? (
                    <DropdownMenuItem disabled>No enrolled courses</DropdownMenuItem>
                  ) : (
                    courses.map((c) => (
                      <DropdownMenuItem
                        key={c.id}
                        onClick={() => setSelectedCourse(selectedCourse?.id === c.id ? null : c)}
                        className="flex items-center justify-between gap-4"
                      >
                        {c.code}
                        {selectedCourse?.id === c.id && <Check className="w-4 h-4 text-indigo-500" />}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tag input area */}
            {tagInputOpen && (
              <div className="pt-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
                    >
                      {tag}
                      <button onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                        <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                      </button>
                    </span>
                  ))}
                </div>
                <Input
                  ref={tagInputRef}
                  placeholder={t('tasks.addTag')}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    if (tagInput.trim()) addTag(tagInput);
                    setTagInput('');
                    setTagInputOpen(false);
                  }}
                  className="text-sm h-8"
                />
              </div>
            )}

            {/* Subtasks section */}
            {subtasksExpanded && !isSubtask && (
              <>
                <div className="border-t my-3" />
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a subtask..."
                      value={newSubInput}
                      onChange={(e) => setNewSubInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewSub(); } }}
                      className="text-sm"
                    />
                    <Button onClick={() => { addNewSub(); setTimeout(saveSubtasks, 0); }} size="icon" variant="outline" className="flex-shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {existingSubs.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded-xl text-sm">
                        <span className="truncate mr-2 text-gray-700">{sub.title}</span>
                        <button onClick={() => setExistingSubs((prev) => prev.filter((s) => s.id !== sub.id))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {newSubTitles.map((subTitle, i) => (
                      <div key={`new-${i}`} className="flex items-center justify-between px-2 py-1.5 bg-indigo-50 rounded-xl text-sm">
                        <span className="truncate mr-2 text-indigo-700">{subTitle}</span>
                        <button onClick={() => setNewSubTitles((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {existingSubs.length === 0 && newSubTitles.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">No subtasks yet.</p>
                    )}
                  </div>
                </div>
              </>
            )}

          </div>
        </DialogContent>
      </Dialog>

      <DatePickerDialog
        isOpen={isDateOpen}
        onOpenChange={setIsDateOpen}
        currentDate={selectedDate}
        onDateSelect={setSelectedDate}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/tasks/edit-task-dialog.tsx
git commit -m "feat: priority and tags UI in EditTaskDialog, pre-populated from task"
```

---

### Task 8: TaskCard — show priority badge and tag chips; wire editFull

**Files:**
- Modify: `apps/frontend/src/components/tasks/tasks-card.tsx`

- [ ] **Step 1: Update EditData type and handleSave**

Update the `EditData` type at the top of the file (after the imports, lines 10–17) to include priority and tags:

```typescript
type EditData = {
  title: string;
  dueDate: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  tags?: string[];
  subtasksToAdd: string[];
  subtaskIdsToDelete: number[];
};
```

Update the `onEditFull` prop type and the `handleSubEditFull` function to accept the expanded data:

```typescript
onEditFull: (
  id: number,
  data: {
    title: string;
    dueDate: string;
    description?: string;
    status?: TaskStatus;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
    tags?: string[];
  },
  subtasksToAdd: string[],
  subtaskIdsToDelete: number[]
) => Promise<void>;
```

Update `handleSave` to pass all EditData fields:

```typescript
async function handleSave(data: EditData) {
  await onEditFull(
    task.id,
    {
      title: data.title,
      dueDate: data.dueDate,
      description: data.description,
      status: data.status,
      priority: data.priority,
      tags: data.tags,
    },
    data.subtasksToAdd,
    data.subtaskIdsToDelete
  );
  setSubtasksLoaded(false);
  setSubtasks([]);
}
```

- [ ] **Step 2: Render priority badge and tag chips**

Add priority + tags constants after the existing urgency constants (after `urgencyColors`, ~line 78):

```typescript
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-600',
  MEDIUM: 'bg-amber-100 text-amber-600',
  HIGH: 'bg-red-100 text-red-600',
};
const PRIORITY_LABELS: Record<string, string> = {
  LOW: t('tasks.priorityLow'),
  MEDIUM: t('tasks.priorityMedium'),
  HIGH: t('tasks.priorityHigh'),
};
```

Add priority badge and tag chips inside the task card body, after the countdown badge (after the `{task.status !== 'DONE' && countdown && ...}` block):

```tsx
{task.priority && task.status !== 'DONE' && (
  <span className={`inline-block mt-1 mr-1 text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
    {PRIORITY_LABELS[task.priority]}
  </span>
)}
{task.tags && task.tags.length > 0 && task.status !== 'DONE' && (
  <div className="flex flex-wrap gap-1 mt-1">
    {task.tags.slice(0, 3).map((tag) => (
      <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md font-medium">
        {tag}
      </span>
    ))}
    {task.tags.length > 3 && (
      <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md font-medium">
        +{task.tags.length - 3} more
      </span>
    )}
  </div>
)}
```

- [ ] **Step 3: Update TaskCard's onEditFull and handleSubEditFull signatures consistently**

The `handleSubEditFull` function (lines 112–126) passes `data` straight to `onEditFull`. Its type annotation should also include `priority` and `tags`. Update it to match the new `onEditFull` prop type above.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/tasks/tasks-card.tsx
git commit -m "feat: show priority badge and tag chips on TaskCard"
```

---

## Self-Review

**Spec coverage:**
- ✅ Schema: `taskPriorityEnum`, `priority`, `tags` on `tasks` table (Task 1)
- ✅ Backend: `CreateTaskSchema`, `UpdateTaskSchema`, INSERT, PATCH, GET (Task 2)
- ✅ Frontend type: `priority`, `tags` on `Task` (Task 3)
- ✅ i18n: 6 keys in en.json + cs.json (Task 4)
- ✅ NewTaskDialog: priority cycling pill + inline tag input with chips (Task 5)
- ✅ EditTaskDialog: same, pre-populated (Task 7)
- ✅ TaskCard: priority badge + tag chips, "+N more" truncation (Task 8)
- ✅ handleCreate in both hooks: priority + tags (Task 6)
- ✅ handleEditFull in useTasksManager: priority + tags (Task 6)
- ✅ TaskSection.onTaskCreated prop: updated signature (Task 6)

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `Priority = 'LOW' | 'MEDIUM' | 'HIGH' | null` defined in Task 5 and re-used in Task 7; Task 8 uses inline `'LOW' | 'MEDIUM' | 'HIGH' | null` (consistent)
- `PRIORITY_CYCLE`, `PRIORITY_STYLES` defined in both Task 5 and Task 7 independently (no shared module needed)
- `onSubmit` in NewTaskDialog → calls `handleCreate` in hooks (signatures match)
- `onSave` in EditTaskDialog → calls `handleEditFull` in TaskCard → calls `onEditFull` in hooks (data object with `priority` + `tags` flows through)
