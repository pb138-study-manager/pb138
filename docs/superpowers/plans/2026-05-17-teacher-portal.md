# Teacher Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teacher sees course detail with role-aware tabs (Assignments | Materials | Students), sidebar is simplified to My Classes + Profile, design polish applied to courses pages.

**Architecture:** `useRoleMode()` drives tab switching inside the existing `/courses/$courseId.tsx` — no new route files. Two new backend endpoints (`GET /courses/:id/assignments`, `GET /courses/:id/students`) serve teacher-specific data. Obsolete `/teachers/assignments|materials|students` pages are deleted.

**Tech Stack:** ElysiaJS + Drizzle ORM (backend), React + TanStack Query + Tailwind CSS (frontend), Bun test (backend tests).

---

## File Map

| File | Action | What changes |
|---|---|---|
| `apps/backend/src/routes/courses.ts` | Modify | Add 2 new GET endpoints |
| `apps/backend/src/routes/courses.test.ts` | Modify | Tests for the 2 new endpoints |
| `apps/frontend/src/components/ui/sidebar.tsx` | Modify | Teacher nav → My Classes + Profile only |
| `apps/frontend/src/components/ui/bottom-nav.tsx` | Modify | Teacher bottom nav → Classes + Profile only |
| `apps/frontend/src/routes/courses/index.tsx` | Modify | `shadow-sm` → `shadow-md` on cards |
| `apps/frontend/src/routes/courses/$courseId.tsx` | Modify | Role-aware tabs + teacher tab content |
| `apps/frontend/src/routes/teachers/assignments.tsx` | Delete | Replaced by course detail tab |
| `apps/frontend/src/routes/teachers/materials.tsx` | Delete | Replaced by course detail tab |
| `apps/frontend/src/routes/teachers/students.tsx` | Delete | Replaced by course detail tab |

---

## Task 1: Backend — GET /courses/:id/assignments

Returns all assignments for a course with done/total student counts. TEACHER role required.

**Files:**
- Modify: `apps/backend/src/routes/courses.ts`
- Modify: `apps/backend/src/routes/courses.test.ts`

- [ ] **Step 1: Write failing test**

Add to `apps/backend/src/routes/courses.test.ts` — inside the existing `describe` block or as a new top-level `describe`:

```typescript
describe('GET /courses/:id/assignments', () => {
  let courseId: number;
  let assignmentId: number;

  beforeAll(async () => {
    const [course] = await db
      .insert(courses)
      .values({ code: 'ASGN-TEST', semester: 'S2026', lectureTeacherId: teacherId })
      .returning();
    courseId = course.id;

    // Enroll the regular user
    await db.insert(userCourses).values({ userId, courseId });

    // Create assignment + task for enrolled user
    const [assignment] = await db
      .insert(assignments)
      .values({ courseId, title: 'Test Assignment', dueDate: new Date('2026-06-01') })
      .returning();
    assignmentId = assignment.id;

    await db.insert(tasks).values({
      userId,
      assignmentId,
      courseId,
      title: 'Test Assignment',
      dueDate: new Date('2026-06-01'),
    });
  });

  afterAll(async () => {
    await db.delete(tasks).where(eq(tasks.assignmentId, assignmentId));
    await db.delete(assignments).where(eq(assignments.id, assignmentId));
    await db.delete(userCourses).where(eq(userCourses.courseId, courseId));
    await db.delete(courses).where(eq(courses.id, courseId));
  });

  it('returns 403 for non-teacher', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/assignments`, userAuth)
    );
    expect(res.status).toBe(403);
  });

  it('returns assignments with done/total counts', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/assignments`, teacherAuth)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    expect(body[0].id).toBe(assignmentId);
    expect(body[0].title).toBe('Test Assignment');
    expect(Number(body[0].total)).toBe(1);
    expect(Number(body[0].done)).toBe(0);
  });
});
```

You also need to add `assignments` to the imports at the top of the test file:
```typescript
import { courses, userCourses, users, userRoles, roles, auditLogs, tasks, assignments } from '../db/schema';
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/backend && bun test src/routes/courses.test.ts --test-name-pattern "GET /courses/:id/assignments"
```

Expected: FAIL — route does not exist yet (404 or handler missing).

- [ ] **Step 3: Implement the endpoint**

Add the following to `apps/backend/src/routes/courses.ts`. Place it after the existing `GET /:id/progress` handler and before `POST /:id/assignments`.

First add `sql` to the drizzle-orm import if not present:
```typescript
import { and, count, eq, isNull, isNotNull, sql } from 'drizzle-orm';
```

Add the endpoint:
```typescript
  .get('/:id/assignments', async ({ params, user, set }) => {
    if (!(user as AuthUser).roles.includes('TEACHER')) {
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
    return db
      .select({
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        dueDate: assignments.dueDate,
        total: count(tasks.id),
        done: sql<number>`count(case when ${tasks.status} = 'DONE' then 1 end)`,
      })
      .from(assignments)
      .leftJoin(
        tasks,
        and(eq(tasks.assignmentId, assignments.id), isNull(tasks.deletedAt))
      )
      .where(and(eq(assignments.courseId, courseId), isNull(assignments.deletedAt)))
      .groupBy(assignments.id);
  })
```

Also ensure `assignments` and `tasks` are imported from schema at the top of `courses.ts`:
```typescript
import { assignments, courses, tasks, userCourses, users, userProfiles } from '../db/schema';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/backend && bun test src/routes/courses.test.ts --test-name-pattern "GET /courses/:id/assignments"
```

Expected: PASS — all 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/courses.ts apps/backend/src/routes/courses.test.ts
git commit -m "feat: add GET /courses/:id/assignments for teacher view"
```

---

## Task 2: Backend — GET /courses/:id/students

Returns enrolled students with per-student task completion stats for a course. TEACHER role required.

**Files:**
- Modify: `apps/backend/src/routes/courses.ts`
- Modify: `apps/backend/src/routes/courses.test.ts`

- [ ] **Step 1: Write failing test**

Add to `apps/backend/src/routes/courses.test.ts`:

```typescript
describe('GET /courses/:id/students', () => {
  let courseId: number;

  beforeAll(async () => {
    const [course] = await db
      .insert(courses)
      .values({ code: 'STU-TEST', semester: 'S2026', lectureTeacherId: teacherId })
      .returning();
    courseId = course.id;
    await db.insert(userCourses).values({ userId, courseId });
  });

  afterAll(async () => {
    await db.delete(userCourses).where(eq(userCourses.courseId, courseId));
    await db.delete(courses).where(eq(courses.id, courseId));
  });

  it('returns 403 for non-teacher', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/students`, userAuth)
    );
    expect(res.status).toBe(403);
  });

  it('returns enrolled students with completion stats', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/students`, teacherAuth)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    expect(body[0].id).toBe(userId);
    expect(typeof body[0].email).toBe('string');
    expect(Number(body[0].total)).toBeGreaterThanOrEqual(0);
    expect(Number(body[0].done)).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/backend && bun test src/routes/courses.test.ts --test-name-pattern "GET /courses/:id/students"
```

Expected: FAIL — route does not exist yet.

- [ ] **Step 3: Implement the endpoint**

Add after the `GET /:id/assignments` handler in `apps/backend/src/routes/courses.ts`:

```typescript
  .get('/:id/students', async ({ params, user, set }) => {
    if (!(user as AuthUser).roles.includes('TEACHER')) {
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
    const enrolled = await db
      .select({
        id: users.id,
        email: users.email,
        name: userProfiles.name,
        avatar: userProfiles.avatar,
      })
      .from(userCourses)
      .innerJoin(users, and(eq(userCourses.userId, users.id), isNull(users.deletedAt)))
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(userCourses.courseId, courseId));

    return Promise.all(
      enrolled.map(async (student) => {
        const [stats] = await db
          .select({
            total: count(tasks.id),
            done: sql<number>`count(case when ${tasks.status} = 'DONE' then 1 end)`,
          })
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, student.id),
              eq(tasks.courseId, courseId),
              isNotNull(tasks.assignmentId),
              isNull(tasks.deletedAt)
            )
          );
        return { ...student, total: stats.total, done: stats.done };
      })
    );
  })
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && bun test src/routes/courses.test.ts
```

Expected: All tests PASS including the 2 new ones.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/courses.ts apps/backend/src/routes/courses.test.ts
git commit -m "feat: add GET /courses/:id/students for teacher view"
```

---

## Task 3: Frontend — Simplify Teacher Nav

Teacher sidebar and bottom nav show only My Classes + Profile.

**Files:**
- Modify: `apps/frontend/src/components/ui/sidebar.tsx`
- Modify: `apps/frontend/src/components/ui/bottom-nav.tsx`

- [ ] **Step 1: Update sidebar teacher nav items**

In `apps/frontend/src/components/ui/sidebar.tsx`, replace the `teacherNavItems` array:

```typescript
const teacherNavItems = [
  { id: 'teachers', icon: <GraduationCap className="w-5 h-5 shrink-0" />, label: 'My Classes', href: '/teachers' },
  { id: 'profile', icon: <Users className="w-5 h-5 shrink-0" />, label: t('nav.profile'), href: '/profile' },
];
```

Remove unused imports from sidebar if they become unused: `Layers`, `UserSquare`.

- [ ] **Step 2: Update bottom nav teacher items**

In `apps/frontend/src/components/ui/bottom-nav.tsx`, replace `teacherItems`:

```typescript
const teacherItems: NavItem[] = [
  { id: 'teachers', label: 'My Classes', href: '/teachers', icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'profile', label: t('nav.profile'), href: '/profile', icon: <Users className="w-5 h-5" /> },
];
```

Remove unused imports: `ClipboardCheck`, `Layers`, `UserSquare`.

- [ ] **Step 3: Verify in browser**

```bash
pnpm --filter @pb138/frontend dev
```

Switch to teacher mode in Profile → open sidebar → confirm only "My Classes" and "Profile" appear. Bottom nav (mobile width) shows same two items.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/ui/sidebar.tsx apps/frontend/src/components/ui/bottom-nav.tsx
git commit -m "feat: simplify teacher nav to My Classes + Profile"
```

---

## Task 4: Frontend — Course List Shadow Polish

Upgrade card shadows on the courses list page.

**Files:**
- Modify: `apps/frontend/src/routes/courses/index.tsx`

- [ ] **Step 1: Update card className**

In `apps/frontend/src/routes/courses/index.tsx`, find the `Card` component and update its className:

```tsx
<Card
  key={course.id}
  onClick={() => navigate({ to: `/courses/${course.id}` })}
  className="rounded-2xl shadow-md cursor-pointer active:scale-95 transition"
>
```

`shadow-sm` → `shadow-md`.

- [ ] **Step 2: Verify in browser**

Cards on `/courses` should have a more pronounced shadow. No functional change.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/routes/courses/index.tsx
git commit -m "fix: upgrade course card shadow to shadow-md"
```

---

## Task 5: Frontend — Course Detail Teacher Tabs

Role-aware tabs in course detail: teacher sees Assignments | Materials | Students with full content.

**Files:**
- Modify: `apps/frontend/src/routes/courses/$courseId.tsx`

- [ ] **Step 1: Add types and imports**

At the top of `apps/frontend/src/routes/courses/$courseId.tsx`, add/update imports:

```typescript
import { useRoleMode } from '@/lib/roleMode';
```

Add new TypeScript interfaces after the existing ones:

```typescript
interface CourseAssignment {
  id: number;
  title: string;
  description: string | null;
  dueDate: string;
  total: number;
  done: number;
}

interface CourseStudent {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  total: number;
  done: number;
}
```

- [ ] **Step 2: Add role mode hook and teacher queries**

Inside `CourseDetailPage`, after the existing hooks, add:

```typescript
const { mode } = useRoleMode();
const isTeacher = mode === 'teacher';

// Teacher-only tab state
const [teacherTab, setTeacherTab] = useState<'assignments' | 'materials' | 'students'>('assignments');

// Teacher queries
const { data: courseAssignments = [] } = useQuery({
  queryKey: ['courseAssignments', courseId],
  queryFn: () => api.get<CourseAssignment[]>(`/courses/${courseId}/assignments`).catch(() => []),
  enabled: isTeacher,
});

const { data: courseStudents = [] } = useQuery({
  queryKey: ['courseStudents', courseId],
  queryFn: () => api.get<CourseStudent[]>(`/courses/${courseId}/students`).catch(() => []),
  enabled: isTeacher,
});

// Teacher material add state
const [showAddMaterial, setShowAddMaterial] = useState(false);
const [matTitle, setMatTitle] = useState('');
const [matUrl, setMatUrl] = useState('');
const [matDesc, setMatDesc] = useState('');
const [savingMat, setSavingMat] = useState(false);

async function handleAddMaterial() {
  if (!matTitle.trim()) return;
  setSavingMat(true);
  try {
    await api.post(`/courses/${courseId}/materials`, {
      title: matTitle.trim(),
      url: matUrl.trim() || undefined,
      description: matDesc.trim() || undefined,
    });
    queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] });
    setMatTitle('');
    setMatUrl('');
    setMatDesc('');
    setShowAddMaterial(false);
  } finally {
    setSavingMat(false);
  }
}

async function handleDeleteMaterial(materialId: number) {
  await api.delete(`/courses/${courseId}/materials/${materialId}`);
  queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] });
}

// Teacher assignment add state
const [showAddAssignment, setShowAddAssignment] = useState(false);
const [asgTitle, setAsgTitle] = useState('');
const [asgDesc, setAsgDesc] = useState('');
const [asgDate, setAsgDate] = useState('');
const [savingAsg, setSavingAsg] = useState(false);

async function handleAddAssignment() {
  if (!asgTitle.trim() || !asgDate) return;
  setSavingAsg(true);
  try {
    await api.post(`/courses/${courseId}/assignments`, {
      title: asgTitle.trim(),
      description: asgDesc.trim() || undefined,
      dueDate: asgDate,
    });
    queryClient.invalidateQueries({ queryKey: ['courseAssignments', courseId] });
    setAsgTitle('');
    setAsgDesc('');
    setAsgDate('');
    setShowAddAssignment(false);
  } finally {
    setSavingAsg(false);
  }
}
```

- [ ] **Step 3: Replace the tab bar JSX**

Find the existing tab bar section (the `<div className="flex border-b ...">` with tasks/notes/materials tabs) and replace it with a role-aware version:

```tsx
{/* Tab bar */}
{isTeacher ? (
  <div className="flex border-b border-gray-200 px-4">
    {(['assignments', 'materials', 'students'] as const).map((tab) => (
      <button
        key={tab}
        onClick={() => setTeacherTab(tab)}
        className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
          teacherTab === tab
            ? 'border-gray-800 text-gray-900'
            : 'border-transparent text-gray-400 hover:text-gray-600'
        }`}
      >
        {tab}
      </button>
    ))}
  </div>
) : (
  <div className="flex border-b border-gray-200 px-4">
    {(['tasks', 'notes', 'materials'] as const).map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
          activeTab === tab
            ? 'border-gray-800 text-gray-900'
            : 'border-transparent text-gray-400 hover:text-gray-600'
        }`}
      >
        {tab}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 4: Add teacher tab content**

After the student tab content blocks (after the closing of the Materials `activeTab === 'materials'` block), add the teacher content. Wrap everything in `{isTeacher && (…)}`:

```tsx
{/* Teacher: Assignments tab */}
{isTeacher && teacherTab === 'assignments' && (
  <div className="px-4 mt-6 mb-6">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-indigo-500" />
        <span className="font-semibold text-gray-900">Assignments</span>
        <span className="text-gray-400 text-sm">{courseAssignments.length}</span>
      </div>
      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowAddAssignment(true)}>
        <Plus className="w-5 h-5 text-gray-700" />
      </Button>
    </div>

    {courseAssignments.length === 0 ? (
      <p className="text-sm text-gray-400 py-4 text-center">No assignments yet</p>
    ) : (
      <div className="space-y-2">
        {courseAssignments.map((asg) => {
          const pct = asg.total > 0 ? asg.done / asg.total : 0;
          const badgeClass = pct >= 0.8
            ? 'bg-green-100 text-green-800'
            : pct >= 0.4
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800';
          return (
            <div key={asg.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-md">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{asg.title}</p>
                <p className="text-xs text-gray-400">
                  Due {new Date(asg.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${badgeClass}`}>
                {Number(asg.done)}/{Number(asg.total)} done
              </span>
            </div>
          );
        })}
      </div>
    )}

    {showAddAssignment && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-8">
        <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-gray-900">New Assignment</h2>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder="Title"
            value={asgTitle}
            onChange={(e) => setAsgTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
            placeholder="Description (optional)"
            rows={2}
            value={asgDesc}
            onChange={(e) => setAsgDesc(e.target.value)}
          />
          <input
            type="datetime-local"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            value={asgDate}
            onChange={(e) => setAsgDate(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowAddAssignment(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddAssignment} disabled={savingAsg || !asgTitle.trim() || !asgDate}>
              {savingAsg ? 'Saving…' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
)}

{/* Teacher: Materials tab */}
{isTeacher && teacherTab === 'materials' && (
  <div className="px-4 mt-6 mb-6">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-indigo-500" />
        <span className="font-semibold text-gray-900">Study Materials</span>
        <span className="text-gray-400 text-sm">{materials.length}</span>
      </div>
      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowAddMaterial(true)}>
        <Plus className="w-5 h-5 text-gray-700" />
      </Button>
    </div>

    {materials.length === 0 ? (
      <p className="text-sm text-gray-400 py-4 text-center">No materials yet</p>
    ) : (
      <div className="space-y-2">
        {materials.map((material) => (
          <div key={material.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-md">
            <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{material.title}</p>
              {material.description && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{material.description}</p>
              )}
            </div>
            <button
              onClick={() => handleDeleteMaterial(material.id)}
              className="text-gray-300 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    )}

    {showAddMaterial && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-8">
        <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Add Material</h2>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder="Title"
            value={matTitle}
            onChange={(e) => setMatTitle(e.target.value)}
            autoFocus
          />
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder="URL (optional)"
            value={matUrl}
            onChange={(e) => setMatUrl(e.target.value)}
          />
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder="Description (optional)"
            value={matDesc}
            onChange={(e) => setMatDesc(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowAddMaterial(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddMaterial} disabled={savingMat || !matTitle.trim()}>
              {savingMat ? 'Saving…' : 'Add'}
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
)}

{/* Teacher: Students tab */}
{isTeacher && teacherTab === 'students' && (
  <div className="px-4 mt-6 mb-6">
    <div className="flex items-center gap-2 mb-3">
      <Users className="w-5 h-5 text-indigo-500" />
      <span className="font-semibold text-gray-900">Students</span>
      <span className="text-gray-400 text-sm">{courseStudents.length}</span>
    </div>

    {courseStudents.length === 0 ? (
      <p className="text-sm text-gray-400 py-4 text-center">No students enrolled</p>
    ) : (
      <div className="space-y-2">
        {courseStudents.map((student) => {
          const initials = (student.name ?? student.email)
            .split(' ')
            .map((w: string) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
          const pct = Number(student.total) > 0 ? Number(student.done) / Number(student.total) : 0;
          const badgeClass = pct >= 0.8
            ? 'bg-green-100 text-green-800'
            : pct >= 0.4
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800';
          return (
            <div key={student.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-md">
              {student.avatar ? (
                <img src={student.avatar} className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-indigo-600">{initials}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{student.name ?? student.email}</p>
                <p className="text-xs text-gray-400 truncate">{student.email}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${badgeClass}`}>
                {Number(student.done)}/{Number(student.total)} done
              </span>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Add missing imports to $courseId.tsx**

Add `Trash2` and `ClipboardCheck` to the lucide-react import if not present:

```typescript
import { ChevronLeft, Plus, CheckSquare, BookOpen, Users, ClipboardCheck, Trash2 } from 'lucide-react';
```

- [ ] **Step 6: Also update the student tab active style**

The student tab bar active style was `border-indigo-500 text-indigo-600` — already replaced in Step 3 with `border-gray-800 text-gray-900`. Confirm no other indigo tab references remain in the file.

- [ ] **Step 7: Verify in browser**

```bash
pnpm --filter @pb138/frontend dev
```

1. As student: `/courses/:id` → tabs Tasks | Notes | Materials work as before, active tab dark gray
2. Switch to teacher mode in Profile settings
3. As teacher: `/courses/:id` → tabs Assignments | Materials | Students visible
4. Assignments tab: list loads (empty state if no assignments), `+` opens modal, create an assignment
5. Materials tab: list loads, `+` opens modal, trash deletes
6. Students tab: list loads with progress badges

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/routes/courses/\$courseId.tsx
git commit -m "feat: teacher course detail with Assignments, Materials, Students tabs"
```

---

## Task 6: Delete Obsolete Teacher Pages

Remove the three shell pages that are no longer needed.

**Files:**
- Delete: `apps/frontend/src/routes/teachers/assignments.tsx`
- Delete: `apps/frontend/src/routes/teachers/materials.tsx`
- Delete: `apps/frontend/src/routes/teachers/students.tsx`

- [ ] **Step 1: Delete the files**

```bash
rm apps/frontend/src/routes/teachers/assignments.tsx
rm apps/frontend/src/routes/teachers/materials.tsx
rm apps/frontend/src/routes/teachers/students.tsx
```

- [ ] **Step 2: Regenerate routeTree**

TanStack Router auto-regenerates `routeTree.gen.ts` when the dev server is running. Start it and let it rebuild:

```bash
pnpm --filter @pb138/frontend dev
```

Wait for the `routeTree.gen.ts` to be updated (Vite output will show it). Stop the server after.

- [ ] **Step 3: Verify no broken links**

Check `sidebar.tsx` and `bottom-nav.tsx` — the `/teachers/assignments`, `/teachers/materials`, `/teachers/students` hrefs were removed in Task 3. Confirm no other file references those paths:

```bash
grep -r "teachers/assignments\|teachers/materials\|teachers/students" apps/frontend/src --include="*.tsx" --include="*.ts"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add -A apps/frontend/src/routes/teachers/ apps/frontend/src/routeTree.gen.ts
git commit -m "feat: remove obsolete teacher sub-pages (content moved to course detail)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Teacher nav → My Classes + Profile (Task 3)
- ✅ Course list shadow (Task 4)
- ✅ Course detail role-aware tabs (Task 5)
- ✅ Teacher Assignments tab with modal (Task 5, Step 4)
- ✅ Teacher Materials tab with add/delete (Task 5, Step 4)
- ✅ Teacher Students tab with progress (Task 5, Step 4)
- ✅ `GET /courses/:id/assignments` backend (Task 1)
- ✅ `GET /courses/:id/students` backend (Task 2)
- ✅ Delete obsolete pages (Task 6)
- ✅ Student tab active style updated to dark gray (Task 5, Step 3+6)

**Placeholder scan:** No TBDs, no vague steps, all code blocks complete.

**Type consistency:**
- `CourseAssignment` defined in Task 5 Step 1, used in Step 2 and Step 4 ✅
- `CourseStudent` defined in Task 5 Step 1, used in Step 2 and Step 4 ✅
- `handleDeleteMaterial(materialId)` defined in Step 2, called in Step 4 ✅
- `handleAddMaterial()` / `handleAddAssignment()` defined in Step 2, called in Step 4 ✅
- Backend returns `done` as SQL aggregate — cast with `Number()` in frontend ✅
