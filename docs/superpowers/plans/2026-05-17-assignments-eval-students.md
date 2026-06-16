# Assignments, Evaluation & Students Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish teacher portal — proper assignment edit/add dialogs with DatePickerDialog, evaluation on completed tasks, add-student functionality, material ownership display, remove teacher info header in teacher mode, remove enroll/unenroll entirely.

**Architecture:** All new teacher UI lives in `apps/frontend/src/routes/courses/$courseId.tsx` and new teacher-specific dialog components under `apps/frontend/src/components/courses/`. Eval backend endpoints added to `apps/backend/src/routes/tasks.ts`. Student enrollment by teacher added to `apps/backend/src/routes/courses.ts`.

**Tech Stack:** React + TanStack Query + Tailwind, ElysiaJS + Drizzle ORM, `DatePickerDialog` from `@/components/tasks/date-picker-dialog`.

---

## File Map

| File                                                              | Action | What changes                                                                     |
| ----------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| `apps/frontend/src/components/courses/new-assignment-dialog.tsx`  | Create | New assignment dialog with DatePickerDialog                                      |
| `apps/frontend/src/components/courses/edit-assignment-dialog.tsx` | Create | Edit assignment dialog with auto-save + DatePickerDialog + student task list     |
| `apps/frontend/src/components/courses/eval-dialog.tsx`            | Create | Evaluation dialog (pass/fail or graded)                                          |
| `apps/frontend/src/routes/courses/$courseId.tsx`                  | Modify | Use new dialogs, remove teacher header, remove enroll button, add student search |
| `apps/backend/src/routes/tasks.ts`                                | Modify | Add `POST /tasks/:id/eval`, `GET /tasks/:id/eval`                                |
| `apps/backend/src/routes/courses.ts`                              | Modify | Add `POST /courses/:id/students` (teacher enrolls a student)                     |
| `apps/backend/src/routes/tasks.test.ts`                           | Modify | Tests for eval endpoints                                                         |
| `apps/backend/src/routes/courses.test.ts`                         | Modify | Test for teacher-enroll-student endpoint                                         |

---

## Task 1: Backend — Task Evaluation Endpoints

Add `POST /tasks/:id/eval` and `GET /tasks/:id/eval` to `apps/backend/src/routes/tasks.ts`.

The `evals` table already exists in schema: `{ id, taskId, feedback, score, evaluatedAt }`.

**Business rules:**

- Only TEACHER can create/update an eval
- Task must be DONE before eval is allowed (return 400 otherwise)
- `score` values: use `-1` to represent pass/fail mode (score = 1 means pass, score = 0 means fail); any `score >= 0` means graded. Frontend decides which mode based on the assignment's `evalType` (see Task 3)
- `POST` upserts — if eval already exists for this task, update it
- Any authenticated user can `GET` their task's eval

**Files:**

- Modify: `apps/backend/src/routes/tasks.ts`
- Modify: `apps/backend/src/routes/tasks.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `apps/backend/src/routes/tasks.test.ts`:

```typescript
describe('POST /tasks/:id/eval', () => {
  let taskId: number;
  let teacherUserId: number;
  const TEACHER_AUTH = 'tasks-eval-teacher-uuid';

  beforeAll(async () => {
    // Create task for test user (already exists: testUserId)
    const [task] = await db
      .insert(tasks)
      .values({ userId: testUserId, title: 'Eval task', dueDate: new Date(), status: 'DONE' })
      .returning();
    taskId = task.id;

    // Create teacher user
    const [teacher] = await db
      .insert(users)
      .values({
        email: 'eval-teacher@example.com',
        login: 'eval-teacher',
        pwdHash: '',
        authId: TEACHER_AUTH,
      })
      .returning();
    teacherUserId = teacher.id;
    const [role] = await db.select().from(roles).where(eq(roles.name, 'TEACHER'));
    if (role) await db.insert(userRoles).values({ userId: teacherUserId, roleId: role.id });

    const secret = new TextEncoder().encode('tasks-test-jwt-secret');
    teacherToken = `Bearer ${await new SignJWT({ sub: TEACHER_AUTH }).setProtectedHeader({ alg: 'HS256' }).sign(secret)}`;
  });

  afterAll(async () => {
    await db.delete(evals).where(eq(evals.taskId, taskId));
    await db.delete(tasks).where(eq(tasks.id, taskId));
    await db.delete(userRoles).where(eq(userRoles.userId, teacherUserId));
    await db.delete(users).where(eq(users.id, teacherUserId));
  });

  it('returns 403 for non-teacher', async () => {
    const res = await testApp.handle(
      await req(`http://localhost/tasks/${taskId}/eval`, {
        method: 'POST',
        body: JSON.stringify({ score: 5, feedback: 'Good' }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(res.status).toBe(403);
  });

  it('creates eval for a DONE task', async () => {
    const res = await testApp.handle(
      new Request(`http://localhost/tasks/${taskId}/eval`, {
        method: 'POST',
        body: JSON.stringify({ score: 8, feedback: 'Well done' }),
        headers: { Authorization: teacherToken, 'Content-Type': 'application/json' },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(8);
    expect(body.feedback).toBe('Well done');
  });

  it('returns 400 for non-DONE task', async () => {
    const [notDoneTask] = await db
      .insert(tasks)
      .values({ userId: testUserId, title: 'Not done', dueDate: new Date(), status: 'TODO' })
      .returning();
    const res = await testApp.handle(
      new Request(`http://localhost/tasks/${notDoneTask.id}/eval`, {
        method: 'POST',
        body: JSON.stringify({ score: 5, feedback: '' }),
        headers: { Authorization: teacherToken, 'Content-Type': 'application/json' },
      })
    );
    expect(res.status).toBe(400);
    await db.delete(tasks).where(eq(tasks.id, notDoneTask.id));
  });
});

describe('GET /tasks/:id/eval', () => {
  it('returns eval for task owner', async () => {
    // Will rely on eval created in POST test above — run after
  });
});
```

Also import `evals`, `userRoles`, `roles` from schema and `SignJWT` if not already present.

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && bun test src/routes/tasks.test.ts --test-name-pattern "eval"
```

Expected: FAIL

- [ ] **Step 3: Implement endpoints**

Add to `apps/backend/src/routes/tasks.ts` (after the toggle-done handler):

```typescript
.post('/:id/eval', async ({ params, body, user, set }) => {
  const authUser = user as AuthUser;
  if (!authUser.roles.includes('TEACHER')) {
    set.status = 403;
    return { error: 'FORBIDDEN', message: 'TEACHER role required' };
  }
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, Number(params.id)), isNull(tasks.deletedAt)));
  if (!task) {
    set.status = 404;
    return { error: 'NOT_FOUND', message: 'Task not found' };
  }
  if (task.status !== 'DONE') {
    set.status = 400;
    return { error: 'NOT_DONE', message: 'Task must be DONE before evaluating' };
  }
  const [existing] = await db.select().from(evals).where(eq(evals.taskId, task.id));
  if (existing) {
    const [updated] = await db
      .update(evals)
      .set({ score: body.score, feedback: body.feedback, evaluatedAt: new Date() })
      .where(eq(evals.id, existing.id))
      .returning();
    await logAction(db, authUser.id, `Updated eval for task ${task.id}`);
    return updated;
  }
  const [created] = await db
    .insert(evals)
    .values({ taskId: task.id, score: body.score, feedback: body.feedback })
    .returning();
  await logAction(db, authUser.id, `Created eval for task ${task.id}`);
  return created;
}, zodBody(z.object({ score: z.number().int().min(0), feedback: z.string() })))

.get('/:id/eval', async ({ params, user, set }) => {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, Number(params.id)), isNull(tasks.deletedAt)));
  if (!task) {
    set.status = 404;
    return { error: 'NOT_FOUND', message: 'Task not found' };
  }
  if (task.userId !== (user as AuthUser).id && !(user as AuthUser).roles.includes('TEACHER')) {
    set.status = 403;
    return { error: 'FORBIDDEN' };
  }
  const [evalRow] = await db.select().from(evals).where(eq(evals.taskId, task.id));
  if (!evalRow) {
    set.status = 404;
    return { error: 'NOT_FOUND', message: 'No evaluation yet' };
  }
  return evalRow;
})
```

Import `evals` from schema.

- [ ] **Step 4: Run all tests**

```bash
cd apps/backend && bun test
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/tasks.ts apps/backend/src/routes/tasks.test.ts
git commit -m "feat: add POST/GET /tasks/:id/eval for teacher evaluation"
```

---

## Task 2: Backend — Teacher Enrolls Student

Add `POST /courses/:id/students` so teachers can enroll any user by email or userId.

**Files:**

- Modify: `apps/backend/src/routes/courses.ts`
- Modify: `apps/backend/src/routes/courses.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
describe('POST /courses/:id/students (teacher enroll)', () => {
  let courseId: number;

  beforeAll(async () => {
    const [course] = await db
      .insert(courses)
      .values({ code: 'ENROLL-TEST', semester: 'S2026', lectureTeacherId: teacherId })
      .returning();
    courseId = course.id;
  });

  afterAll(async () => {
    await db.delete(userCourses).where(eq(userCourses.courseId, courseId));
    await db.delete(courses).where(eq(courses.id, courseId));
  });

  it('returns 403 for non-teacher', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/students`, userAuth, {
        method: 'POST',
        body: JSON.stringify({ userId }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(res.status).toBe(403);
  });

  it('teacher can enroll a student', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/students`, teacherAuth, {
        method: 'POST',
        body: JSON.stringify({ userId }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 409 if already enrolled', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/students`, teacherAuth, {
        method: 'POST',
        body: JSON.stringify({ userId }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run to verify fail**

```bash
cd apps/backend && bun test src/routes/courses.test.ts --test-name-pattern "teacher enroll"
```

- [ ] **Step 3: Implement endpoint**

Add to `apps/backend/src/routes/courses.ts` after `GET /:id/students`:

```typescript
.post('/:id/students', async ({ params, body, user, set }) => {
  const authUser = user as AuthUser;
  if (!authUser.roles.includes('TEACHER')) {
    set.status = 403;
    return { error: 'FORBIDDEN', message: 'TEACHER role required' };
  }
  const courseId = Number(params.id);
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
  if (!course) {
    set.status = 404;
    return { error: 'NOT_FOUND', message: 'Course not found' };
  }
  if (course.lectureTeacherId !== authUser.id) {
    set.status = 403;
    return { error: 'FORBIDDEN', message: 'Access denied: you do not teach this course' };
  }
  const [targetUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, body.userId), isNull(users.deletedAt)));
  if (!targetUser) {
    set.status = 404;
    return { error: 'NOT_FOUND', message: 'User not found' };
  }
  const [existing] = await db
    .select()
    .from(userCourses)
    .where(and(eq(userCourses.userId, body.userId), eq(userCourses.courseId, courseId)));
  if (existing) {
    set.status = 409;
    return { error: 'ALREADY_ENROLLED', message: 'User is already enrolled' };
  }
  await db.insert(userCourses).values({ userId: body.userId, courseId });
  await logAction(db, authUser.id, `Enrolled user ${body.userId} in course ${courseId}`);
  return { success: true };
}, zodBody(z.object({ userId: z.number().int().positive() })))
```

- [ ] **Step 4: Run all tests, commit**

```bash
cd apps/backend && bun test
git add apps/backend/src/routes/courses.ts apps/backend/src/routes/courses.test.ts
git commit -m "feat: add POST /courses/:id/students for teacher enrollment"
```

---

## Task 3: Backend — Add evalType to Assignments

Add `evalType` column to `assignments` table: `'none' | 'pass_fail' | 'graded'`.

**Files:**

- Modify: `apps/backend/src/db/schema.ts`
- New migration: `bun run db:generate && bun run db:push`
- Modify: `apps/backend/src/routes/courses.ts` (include evalType in GET /courses/:id/assignments response, accept it in POST /courses/:id/assignments)

- [ ] **Step 1: Add column to schema**

In `apps/backend/src/db/schema.ts`, find the `assignments` table and add:

```typescript
export const evalTypeEnum = pgEnum('eval_type', ['none', 'pass_fail', 'graded']);

// In assignments table:
evalType: evalTypeEnum('eval_type').notNull().default('none'),
```

- [ ] **Step 2: Generate and push migration**

```bash
cd apps/backend && bun run db:generate && bun run db:push
```

- [ ] **Step 3: Update POST /courses/:id/assignments**

In `courses.ts`, update the `zodBody` schema for `POST /:id/assignments` to accept `evalType`:

```typescript
zodBody(
  z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.string(),
    evalType: z.enum(['none', 'pass_fail', 'graded']).optional().default('none'),
  })
);
```

And in the insert:

```typescript
.values({
  courseId: course.id,
  title: body.title,
  description: body.description,
  dueDate: new Date(body.dueDate),
  evalType: body.evalType ?? 'none',
})
```

Also add `evalType` to the `GET /:id/assignments` select.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/db/schema.ts apps/backend/drizzle/ apps/backend/src/routes/courses.ts
git commit -m "feat: add evalType to assignments (none | pass_fail | graded)"
```

---

## Task 4: Frontend — New Assignment Dialog

Replace the inline bottom-sheet in `$courseId.tsx` with a proper `NewAssignmentDialog` component using `DatePickerDialog`.

**Files:**

- Create: `apps/frontend/src/components/courses/new-assignment-dialog.tsx`
- Modify: `apps/frontend/src/routes/courses/$courseId.tsx`

- [ ] **Step 1: Create NewAssignmentDialog**

```tsx
// apps/frontend/src/components/courses/new-assignment-dialog.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    dueDate: string;
    evalType: 'none' | 'pass_fail' | 'graded';
  }) => Promise<void>;
}

export default function NewAssignmentDialog({ isOpen, onOpenChange, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [evalType, setEvalType] = useState<'none' | 'pass_fail' | 'graded'>('none');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !selectedDate) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: selectedDate.toISOString(),
        evalType,
      });
      setTitle('');
      setDescription('');
      setSelectedDate(null);
      setEvalType('none');
      onOpenChange(false);
    } catch {
      // dialog stays open on error
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-8">
        <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-gray-900">New Assignment</h2>

          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
            placeholder="Description (optional)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Date picker — same pattern as edit-task-dialog */}
          <button
            onClick={() => setIsDateOpen(true)}
            className={`w-full text-left border rounded-xl px-3 py-2 text-sm ${
              selectedDate ? 'border-indigo-300 text-gray-900' : 'border-gray-200 text-gray-400'
            }`}
          >
            {selectedDate ? selectedDate.toLocaleDateString() : 'Due date'}
          </button>

          {/* Eval type selector */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">Evaluation type</p>
            <div className="flex gap-2">
              {(['none', 'pass_fail', 'graded'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setEvalType(type)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    evalType === type
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {type === 'none' ? 'None' : type === 'pass_fail' ? 'Pass/Fail' : 'Graded'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={saving || !title.trim() || !selectedDate}
            >
              {saving ? 'Saving…' : 'Create'}
            </Button>
          </div>
        </div>
      </div>

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

- [ ] **Step 2: Update $courseId.tsx to use NewAssignmentDialog**

Replace the inline assignment add bottom-sheet with `<NewAssignmentDialog>`. Import the component, update `handleAddAssignment` to accept the structured data from the dialog.

- [ ] **Step 3: Verify TypeScript, commit**

```bash
pnpm --filter @pb138/frontend tsc --noEmit 2>&1 | grep "courseId\|new-assignment" | head -10
git add apps/frontend/src/components/courses/new-assignment-dialog.tsx apps/frontend/src/routes/courses/\$courseId.tsx
git commit -m "feat: NewAssignmentDialog with DatePickerDialog and evalType"
```

---

## Task 5: Frontend — Edit Assignment Dialog

Create `EditAssignmentDialog` with auto-save (useEffect debounce pattern from `edit-task-dialog.tsx`) and a list of student tasks showing completion status.

**Files:**

- Create: `apps/frontend/src/components/courses/edit-assignment-dialog.tsx`
- Modify: `apps/frontend/src/routes/courses/$courseId.tsx`

- [ ] **Step 1: Create EditAssignmentDialog**

The dialog opens when a teacher taps an assignment card. It shows:

- Editable title (auto-saves after 600ms debounce — `PATCH /courses/:id/assignments/:assignmentId` — NOTE: this endpoint doesn't exist yet, add it in Task 6 backend)
- Date picker (auto-saves on change)
- Eval type selector (auto-saves on change)
- List of students and their task status (done/not done)
- Eval button on each DONE student task (opens EvalDialog)

```tsx
// apps/frontend/src/components/courses/edit-assignment-dialog.tsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import DatePickerDialog from '@/components/tasks/date-picker-dialog';
import { api } from '@/lib/api';
import { X, CheckCircle, Circle } from 'lucide-react';

interface AssignmentStudent {
  taskId: number;
  userId: number;
  name: string | null;
  email: string;
  avatar: string | null;
  status: 'TODO' | 'IN PROGRESS' | 'DONE';
  evalScore: number | null;
}

interface Props {
  assignmentId: number;
  courseId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialDueDate: string;
  initialEvalType: 'none' | 'pass_fail' | 'graded';
  onClose: () => void;
  onEval: (taskId: number, evalType: 'pass_fail' | 'graded') => void;
}

export default function EditAssignmentDialog({
  assignmentId,
  courseId,
  initialTitle,
  initialDescription,
  initialDueDate,
  initialEvalType,
  onClose,
  onEval,
}: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(initialDueDate));
  const [evalType, setEvalType] = useState(initialEvalType);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const initializedRef = useRef(false);

  // Auto-save on change (same pattern as edit-task-dialog)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    if (!title.trim() || !selectedDate) return;
    const timer = setTimeout(async () => {
      try {
        await api.patch(`/courses/${courseId}/assignments/${assignmentId}`, {
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: selectedDate.toISOString(),
          evalType,
        });
        queryClient.invalidateQueries({ queryKey: ['courseAssignments', courseId] });
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [title, description, selectedDate, evalType]);

  // Fetch per-assignment student task list
  const { data: students = [] } = useQuery({
    queryKey: ['assignmentStudents', assignmentId],
    queryFn: () =>
      api.get<AssignmentStudent[]>(`/courses/${courseId}/assignments/${assignmentId}/students`),
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-8">
        <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Edit Assignment</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
            placeholder="Description (optional)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button
            onClick={() => setIsDateOpen(true)}
            className="w-full text-left border border-indigo-300 rounded-xl px-3 py-2 text-sm text-gray-900"
          >
            {selectedDate ? selectedDate.toLocaleDateString() : 'Due date'}
          </button>

          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">Evaluation type</p>
            <div className="flex gap-2">
              {(['none', 'pass_fail', 'graded'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setEvalType(type)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    evalType === type
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {type === 'none' ? 'None' : type === 'pass_fail' ? 'Pass/Fail' : 'Graded'}
                </button>
              ))}
            </div>
          </div>

          {/* Student task list — "subtasks" for assignments */}
          {students.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Students
              </p>
              {students.map((s) => {
                const initials = (s.name ?? s.email)
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                return (
                  <div
                    key={s.taskId}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2"
                  >
                    {s.avatar ? (
                      <img src={s.avatar} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-indigo-600">{initials}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {s.name ?? s.email}
                      </p>
                    </div>
                    {s.status === 'DONE' ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                    )}
                    {s.status === 'DONE' && evalType !== 'none' && (
                      <button
                        onClick={() => onEval(s.taskId, evalType as 'pass_fail' | 'graded')}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 shrink-0"
                      >
                        {s.evalScore !== null ? 'Edit eval' : 'Evaluate'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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

- [ ] **Step 2: Wire up in $courseId.tsx**

Add `editingAssignment` state. Clicking an assignment card opens the edit dialog. Pass `onEval` callback that opens the EvalDialog (Task 7).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/courses/edit-assignment-dialog.tsx apps/frontend/src/routes/courses/\$courseId.tsx
git commit -m "feat: EditAssignmentDialog with auto-save, DatePickerDialog, student list"
```

---

## Task 6: Backend — Assignment Detail Endpoints

Add:

- `PATCH /courses/:id/assignments/:assignmentId` — update assignment (title, description, dueDate, evalType)
- `GET /courses/:id/assignments/:assignmentId/students` — per-assignment student task list with eval status

**Files:**

- Modify: `apps/backend/src/routes/courses.ts`

- [ ] **Step 1: Implement PATCH /courses/:id/assignments/:assignmentId**

```typescript
.patch('/:id/assignments/:assignmentId', async ({ params, body, user, set }) => {
  const authUser = user as AuthUser;
  if (!authUser.roles.includes('TEACHER')) {
    set.status = 403;
    return { error: 'FORBIDDEN', message: 'TEACHER role required' };
  }
  const courseId = Number(params.id);
  const assignmentId = Number(params.assignmentId);
  const [course] = await db.select().from(courses).where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
  if (!course) { set.status = 404; return { error: 'NOT_FOUND' }; }
  if (course.lectureTeacherId !== authUser.id) { set.status = 403; return { error: 'FORBIDDEN' }; }
  const [existing] = await db.select().from(assignments).where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId), isNull(assignments.deletedAt)));
  if (!existing) { set.status = 404; return { error: 'NOT_FOUND', message: 'Assignment not found' }; }
  const [updated] = await db
    .update(assignments)
    .set({
      ...(body.title && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.dueDate && { dueDate: new Date(body.dueDate) }),
      ...(body.evalType && { evalType: body.evalType }),
    })
    .where(eq(assignments.id, assignmentId))
    .returning();
  await logAction(db, authUser.id, `Updated assignment ${assignmentId}`);
  return updated;
}, zodBody(z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  evalType: z.enum(['none', 'pass_fail', 'graded']).optional(),
})))
```

- [ ] **Step 2: Implement GET /courses/:id/assignments/:assignmentId/students**

Returns each enrolled student's task for this assignment, including eval score if present:

```typescript
.get('/:id/assignments/:assignmentId/students', async ({ params, user, set }) => {
  const authUser = user as AuthUser;
  if (!authUser.roles.includes('TEACHER')) { set.status = 403; return { error: 'FORBIDDEN' }; }
  const courseId = Number(params.id);
  const assignmentId = Number(params.assignmentId);
  const [course] = await db.select().from(courses).where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
  if (!course) { set.status = 404; return { error: 'NOT_FOUND' }; }
  if (course.lectureTeacherId !== authUser.id) { set.status = 403; return { error: 'FORBIDDEN' }; }
  const rows = await db
    .select({
      taskId: tasks.id,
      userId: users.id,
      name: userProfiles.name,
      email: users.email,
      avatar: userProfiles.avatar,
      status: tasks.status,
      evalScore: evals.score,
    })
    .from(tasks)
    .innerJoin(users, and(eq(tasks.userId, users.id), isNull(users.deletedAt)))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .leftJoin(evals, eq(evals.taskId, tasks.id))
    .where(and(eq(tasks.assignmentId, assignmentId), eq(tasks.courseId, courseId), isNull(tasks.deletedAt)));
  return rows;
})
```

- [ ] **Step 3: Import `evals` in courses.ts, run tests, commit**

```bash
cd apps/backend && bun test
git add apps/backend/src/routes/courses.ts
git commit -m "feat: PATCH assignment + GET assignment students with eval status"
```

---

## Task 7: Frontend — Evaluation Dialog

Create `EvalDialog` for teacher to grade a student's completed task.

**Files:**

- Create: `apps/frontend/src/components/courses/eval-dialog.tsx`
- Modify: `apps/frontend/src/routes/courses/$courseId.tsx`

- [ ] **Step 1: Create EvalDialog**

```tsx
// apps/frontend/src/components/courses/eval-dialog.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Props {
  taskId: number;
  evalType: 'pass_fail' | 'graded';
  currentScore: number | null;
  currentFeedback?: string;
  onClose: () => void;
  onSubmit: (taskId: number, score: number, feedback: string) => Promise<void>;
}

export default function EvalDialog({
  taskId,
  evalType,
  currentScore,
  currentFeedback = '',
  onClose,
  onSubmit,
}: Props) {
  const [score, setScore] = useState<number | null>(currentScore);
  const [feedback, setFeedback] = useState(currentFeedback);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (score === null) return;
    setSaving(true);
    try {
      await onSubmit(taskId, score, feedback);
      onClose();
    } catch {
      /* stay open */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 px-4 pb-8">
      <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Evaluate</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {evalType === 'pass_fail' ? (
          <div className="flex gap-3">
            <button
              onClick={() => setScore(1)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${score === 1 ? 'bg-green-500 text-white border-green-500' : 'text-green-600 border-green-200'}`}
            >
              ✓ Pass
            </button>
            <button
              onClick={() => setScore(0)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${score === 0 ? 'bg-red-500 text-white border-red-500' : 'text-red-600 border-red-200'}`}
            >
              ✗ Fail
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-medium">Score (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              value={score ?? ''}
              onChange={(e) => setScore(e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
        )}

        <textarea
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
          placeholder="Feedback (optional)"
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={saving || score === null}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire up in $courseId.tsx**

Add `evalDialogState: { taskId: number; evalType: 'pass_fail' | 'graded'; score: number | null } | null` state. The `onEval` callback from EditAssignmentDialog sets this state. Add `handleSubmitEval` that calls `POST /tasks/:id/eval` and invalidates `assignmentStudents` query.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/courses/eval-dialog.tsx apps/frontend/src/routes/courses/\$courseId.tsx
git commit -m "feat: EvalDialog for pass/fail and graded evaluation"
```

---

## Task 8: Frontend — Add Student Search to Students Tab

In the Students tab (teacher view), add a "Add Student" button that opens a search input. Uses `GET /users/search?q=...` to find users by name/email, then calls `POST /courses/:id/students`.

**Files:**

- Modify: `apps/frontend/src/routes/courses/$courseId.tsx`

- [ ] **Step 1: Add add-student UI inline**

In the Students tab header row, add a `+` button. Clicking it reveals an inline search input (same pattern as how task sections reveal a new task input). The input calls `/users/search?q=...` with 300ms debounce. Results show as a dropdown list of name + email. Selecting a user calls `POST /courses/:id/students` then invalidates `courseStudents` query.

```tsx
// Add to state declarations:
const [showAddStudent, setShowAddStudent] = useState(false);
const [studentQuery, setStudentQuery] = useState('');
const [studentResults, setStudentResults] = useState<
  { id: number; name: string | null; email: string }[]
>([]);
const [addingStudent, setAddingStudent] = useState(false);

// Add search handler:
useEffect(() => {
  if (studentQuery.length < 2) {
    setStudentResults([]);
    return;
  }
  const timer = setTimeout(async () => {
    const results = await api
      .get<
        { id: number; name: string | null; email: string }[]
      >(`/users/search?q=${encodeURIComponent(studentQuery)}`)
      .catch(() => []);
    setStudentResults(results);
  }, 300);
  return () => clearTimeout(timer);
}, [studentQuery]);

async function handleAddStudent(userId: number) {
  setAddingStudent(true);
  try {
    await api.post(`/courses/${courseId}/students`, { userId });
    queryClient.invalidateQueries({ queryKey: ['courseStudents', courseId] });
    setShowAddStudent(false);
    setStudentQuery('');
    setStudentResults([]);
  } catch {
    /* ignore */
  } finally {
    setAddingStudent(false);
  }
}
```

The inline search UI renders below the Students header when `showAddStudent` is true:

```tsx
{
  showAddStudent && (
    <div className="relative mb-3">
      <input
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
        placeholder="Search by name or email..."
        value={studentQuery}
        onChange={(e) => setStudentQuery(e.target.value)}
        autoFocus
      />
      {studentResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
          {studentResults.map((u) => (
            <button
              key={u.id}
              onClick={() => handleAddStudent(u.id)}
              disabled={addingStudent}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm"
            >
              <span className="font-medium text-gray-900">{u.name ?? u.email}</span>
              {u.name && <span className="text-gray-400 ml-2 text-xs">{u.email}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/routes/courses/\$courseId.tsx
git commit -m "feat: add student search and enrollment from Students tab"
```

---

## Task 9: Frontend — Remove Teacher Header + Remove Enroll Button

**Files:**

- Modify: `apps/frontend/src/routes/courses/$courseId.tsx`

- [ ] **Step 1: Remove teacher display for teacher's own view**

Find the teacher row section:

```tsx
{
  /* Teacher */
}
<div className="flex items-center gap-3 mb-4">...teacherName / teacherAvatar...</div>;
```

Wrap it so it only shows in student mode:

```tsx
{
  !isTeacher && <div className="flex items-center gap-3 mb-4">...</div>;
}
```

- [ ] **Step 2: Remove enroll/unenroll button completely**

The enroll button is already hidden for teachers (added in previous task). Now remove it completely — delete the button and the `handleEnroll` function, `enrolling` state, and the `enrolled` field from the `Course` interface. Also remove the import-time `enrolled` field from API usage.

- [ ] **Step 3: Clean up unused state**

Remove: `enrolling`, `handleEnroll`. Keep `course.enrolled` only if anything else in the component uses it (it likely doesn't after removing the button).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/routes/courses/\$courseId.tsx
git commit -m "feat: remove teacher header in teacher mode, remove enroll button entirely"
```

---

## What This Does NOT Change

- Student task view (Tasks / Notes / Materials tabs) — untouched
- `/teachers/` My Classes page — untouched
- All other pages (Today, Tasks, Notes, Timeline, Profile, Admin) — untouched
- Backend: `/courses/enroll` and `/courses/unenroll` endpoints remain (mobile or future use)
