# Courses API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 9-endpoint Courses API with role-based access (TEACHER), enrollment management, and progress tracking.

**Architecture:** Single route file `routes/courses.ts` registered in `index.ts`. Role checks inline (`roles.includes('TEACHER')`). Ownership check for PATCH/DELETE uses `course.lectureTeacherId === user.id`. Tests use two isolated users — a regular user and a TEACHER — created fresh per test run.

**Tech Stack:** ElysiaJS, Drizzle ORM, Bun test, PostgreSQL, Supabase JWT (`jose`)

---

## File Map

| File | Action |
|---|---|
| `apps/backend/src/routes/courses.ts` | Create — 9 endpoints |
| `apps/backend/src/routes/courses.test.ts` | Create — ~18 tests |
| `apps/backend/src/index.ts` | Modify — import + `.use(coursesRoutes)` |

---

### Task 1: Scaffold courses test + GET /courses

**Files:**
- Create: `apps/backend/src/routes/courses.ts`
- Create: `apps/backend/src/routes/courses.test.ts`

**Context:** This task is the most complex setup in the project because we need two users — a regular user and a TEACHER. The TEACHER user requires a `userRoles` row linking them to the `TEACHER` role. Both users share one JWT secret but use different `sub` values. The `req()` helper takes an explicit `auth` string so tests can pick which user to authenticate as.

The `roles` table is pre-seeded in the database — look up the TEACHER role by name rather than hard-coding an ID.

- [ ] **Step 1: Write the failing test (create `courses.test.ts`)**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../db';
import { courses, userCourses, users, userRoles, roles, auditLogs, tasks } from '../db/schema';
import { coursesRoutes } from './courses';
import { eq, and } from 'drizzle-orm';
import { SignJWT } from 'jose';

const TEST_SECRET = 'courses-test-jwt-secret';
const USER_AUTH_ID = 'courses-test-user-uuid';
const TEACHER_AUTH_ID = 'courses-test-teacher-uuid';
process.env.SUPABASE_JWT_SECRET = TEST_SECRET;

async function makeToken(authId: string): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  return new SignJWT({ sub: authId })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
}

export let userId: number;
export let teacherId: number;
export let userAuth: string;
export let teacherAuth: string;
let testApp: Elysia;

function req(url: string, auth: string, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: { Authorization: auth, ...init.headers },
  });
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email: 'courses-user@example.com', login: 'courses-test-user', pwdHash: '', authId: USER_AUTH_ID })
    .returning();
  userId = user.id;

  const [teacher] = await db
    .insert(users)
    .values({ email: 'courses-teacher@example.com', login: 'courses-test-teacher', pwdHash: '', authId: TEACHER_AUTH_ID })
    .returning();
  teacherId = teacher.id;

  const [teacherRole] = await db.select().from(roles).where(eq(roles.name, 'TEACHER'));
  await db.insert(userRoles).values({ userId: teacherId, roleId: teacherRole.id });

  userAuth = `Bearer ${await makeToken(USER_AUTH_ID)}`;
  teacherAuth = `Bearer ${await makeToken(TEACHER_AUTH_ID)}`;
  testApp = new Elysia().use(coursesRoutes);
});

afterAll(async () => {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, userId));
  await db.delete(auditLogs).where(eq(auditLogs.actorId, teacherId));
  await db.delete(tasks).where(eq(tasks.userId, userId));
  await db.delete(tasks).where(eq(tasks.userId, teacherId));
  await db.delete(userCourses).where(eq(userCourses.userId, userId));
  await db.delete(userCourses).where(eq(userCourses.userId, teacherId));
  await db.delete(courses).where(eq(courses.lectureTeacherId, teacherId));
  await db.delete(userRoles).where(eq(userRoles.userId, teacherId));
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(users).where(eq(users.id, teacherId));
});

describe('GET /courses', () => {
  it('returns all courses with enrolled: false for a new user', async () => {
    const res = await testApp.handle(req('http://localhost/courses', userAuth));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    body.forEach((c: { enrolled: boolean }) => expect(c.enrolled).toBe(false));
  });

  it('returns enrolled: true after enrolling', async () => {
    const [course] = await db
      .insert(courses)
      .values({ code: 'GET-TEST', semester: 'Spring 2026', lectureTeacherId: teacherId })
      .returning();
    await db.insert(userCourses).values({ userId, courseId: course.id });

    const res = await testApp.handle(req('http://localhost/courses', userAuth));
    const body = await res.json();
    const found = body.find((c: { id: number }) => c.id === course.id);
    expect(found.enrolled).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module not found)**

```bash
cd apps/backend
bun test src/routes/courses.test.ts
```

Expected: FAIL — `Cannot find module './courses'`

- [ ] **Step 3: Create `apps/backend/src/routes/courses.ts` with GET /**

```typescript
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { courses, userCourses, tasks } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, sql } from 'drizzle-orm';

export const coursesRoutes = new Elysia({ prefix: '/courses' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', async ({ user }) => {
    return db
      .select({
        id: courses.id,
        code: courses.code,
        name: courses.name,
        semester: courses.semester,
        color: courses.color,
        lectureSchedule: courses.lectureSchedule,
        seminarSchedule: courses.seminarSchedule,
        lectureTeacherId: courses.lectureTeacherId,
        seminarTeacherId: courses.seminarTeacherId,
        deletedAt: courses.deletedAt,
        enrolled: sql<boolean>`${userCourses.userId} IS NOT NULL`,
      })
      .from(courses)
      .leftJoin(
        userCourses,
        and(
          eq(userCourses.courseId, courses.id),
          eq(userCourses.userId, (user as AuthUser).id)
        )
      )
      .where(isNull(courses.deletedAt));
  });
```

- [ ] **Step 4: Run — expect PASS**

```bash
bun test src/routes/courses.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/courses.ts apps/backend/src/routes/courses.test.ts
git commit -m "feat: scaffold courses routes and add GET /courses"
```

---

### Task 2: GET /courses/enrolled

**Files:**
- Modify: `apps/backend/src/routes/courses.ts`
- Modify: `apps/backend/src/routes/courses.test.ts`

**Context:** This endpoint uses an INNER JOIN (not LEFT JOIN) so only enrolled courses are returned. No `enrolled` flag needed. Must be declared as `.get('/enrolled', ...)` before `.get('/:id', ...)` — Elysia matches routes in order, so `/enrolled` would otherwise be captured by `/:id`.

- [ ] **Step 1: Append tests to `courses.test.ts`**

```typescript
describe('GET /courses/enrolled', () => {
  it('returns empty array when not enrolled', async () => {
    const res = await testApp.handle(req('http://localhost/courses/enrolled', userAuth));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('returns only enrolled courses', async () => {
    const [course] = await db
      .insert(courses)
      .values({ code: 'ENROLLED-TEST', semester: 'Spring 2026', lectureTeacherId: teacherId })
      .returning();
    await db.insert(userCourses).values({ userId, courseId: course.id });

    const res = await testApp.handle(req('http://localhost/courses/enrolled', userAuth));
    const body = await res.json();
    expect(body.some((c: { id: number }) => c.id === course.id)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/courses.test.ts
```

Expected: enrolled tests FAIL with 404 (route not found).

- [ ] **Step 3: Add GET /enrolled to `courses.ts` (before `/:id`)**

Remove the trailing `;` from `.get('/')` and append:

```typescript
  .get('/enrolled', async ({ user }) => {
    return db
      .select({
        id: courses.id,
        code: courses.code,
        name: courses.name,
        semester: courses.semester,
        color: courses.color,
        lectureSchedule: courses.lectureSchedule,
        seminarSchedule: courses.seminarSchedule,
        lectureTeacherId: courses.lectureTeacherId,
        seminarTeacherId: courses.seminarTeacherId,
        deletedAt: courses.deletedAt,
      })
      .from(courses)
      .innerJoin(
        userCourses,
        and(
          eq(userCourses.courseId, courses.id),
          eq(userCourses.userId, (user as AuthUser).id)
        )
      )
      .where(isNull(courses.deletedAt));
  });
```

- [ ] **Step 4: Run — expect all PASS**

```bash
bun test src/routes/courses.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/courses.ts apps/backend/src/routes/courses.test.ts
git commit -m "feat: add GET /courses/enrolled"
```

---

### Task 3: POST /courses

**Files:**
- Modify: `apps/backend/src/routes/courses.ts`
- Modify: `apps/backend/src/routes/courses.test.ts`

**Context:** Requires TEACHER role — check `(user as AuthUser).roles.includes('TEACHER')`, return 403 if not. If `lectureTeacherId` is not in the body, default to `(user as AuthUser).id`.

- [ ] **Step 1: Append tests to `courses.test.ts`**

```typescript
describe('POST /courses', () => {
  it('creates a course and defaults lectureTeacherId to current user', async () => {
    const res = await testApp.handle(
      req('http://localhost/courses', teacherAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'PB999', semester: 'Fall 2026' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe('PB999');
    expect(body.lectureTeacherId).toBe(teacherId);
  });

  it('returns 403 when called by non-TEACHER user', async () => {
    const res = await testApp.handle(
      req('http://localhost/courses', userAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'HACK01', semester: 'Fall 2026' }),
      })
    );
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/courses.test.ts
```

Expected: POST tests FAIL with 405.

- [ ] **Step 3: Add POST / to `courses.ts`**

Remove trailing `;` from `.get('/enrolled')` and append:

```typescript
  .post(
    '/',
    async ({ body, user, set }) => {
      if (!(user as AuthUser).roles.includes('TEACHER')) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'TEACHER role required' };
      }
      const [course] = await db
        .insert(courses)
        .values({
          code: body.code,
          semester: body.semester,
          name: body.name,
          color: body.color,
          lectureSchedule: body.lectureSchedule,
          seminarSchedule: body.seminarSchedule,
          lectureTeacherId: body.lectureTeacherId ?? (user as AuthUser).id,
          seminarTeacherId: body.seminarTeacherId,
        })
        .returning();
      await logAction(db, (user as AuthUser).id, `Created course ${course.id}: ${course.code}`);
      return course;
    },
    {
      body: t.Object({
        code: t.String({ minLength: 1 }),
        semester: t.String({ minLength: 1 }),
        name: t.Optional(t.String()),
        color: t.Optional(t.String()),
        lectureSchedule: t.Optional(t.String()),
        seminarSchedule: t.Optional(t.String()),
        lectureTeacherId: t.Optional(t.Number()),
        seminarTeacherId: t.Optional(t.Number()),
      }),
    }
  );
```

- [ ] **Step 4: Run — expect all PASS**

```bash
bun test src/routes/courses.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/courses.ts apps/backend/src/routes/courses.test.ts
git commit -m "feat: add POST /courses with TEACHER role check"
```

---

### Task 4: GET /courses/:id

**Files:**
- Modify: `apps/backend/src/routes/courses.ts`
- Modify: `apps/backend/src/routes/courses.test.ts`

**Context:** Returns the course plus `enrolledCount` — the number of rows in `user_courses` for this course. Fetch all enrollment rows and use `.length`. Return 404 if not found or soft-deleted.

- [ ] **Step 1: Append tests to `courses.test.ts`**

```typescript
describe('GET /courses/:id', () => {
  let courseId: number;

  beforeAll(async () => {
    const [course] = await db
      .insert(courses)
      .values({ code: 'DETAIL-TEST', semester: 'Spring 2026', lectureTeacherId: teacherId })
      .returning();
    courseId = course.id;
    await db.insert(userCourses).values({ userId, courseId: course.id });
  });

  it('returns course with enrolledCount', async () => {
    const res = await testApp.handle(req(`http://localhost/courses/${courseId}`, userAuth));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(courseId);
    expect(body.enrolledCount).toBe(1);
  });

  it('returns 404 for unknown id', async () => {
    const res = await testApp.handle(req('http://localhost/courses/999999', userAuth));
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/courses.test.ts
```

Expected: GET /:id tests FAIL.

- [ ] **Step 3: Add GET /:id to `courses.ts`**

Remove trailing `;` from `.post('/')` and append:

```typescript
  .get('/:id', async ({ params, user, set }) => {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    const enrolledRows = await db
      .select()
      .from(userCourses)
      .where(eq(userCourses.courseId, course.id));
    return { ...course, enrolledCount: enrolledRows.length };
  });
```

- [ ] **Step 4: Run — expect all PASS**

```bash
bun test src/routes/courses.test.ts
```

Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/courses.ts apps/backend/src/routes/courses.test.ts
git commit -m "feat: add GET /courses/:id with enrolledCount"
```

---

### Task 5: PATCH /courses/:id

**Files:**
- Modify: `apps/backend/src/routes/courses.ts`
- Modify: `apps/backend/src/routes/courses.test.ts`

**Context:** Two checks before updating: (1) TEACHER role — return 403 if not. (2) `course.lectureTeacherId === user.id` — return 403 if authenticated teacher is not the lecture teacher. 404 if course not found/deleted. Only update fields that are present in the body (conditional spreads).

- [ ] **Step 1: Append tests to `courses.test.ts`**

```typescript
describe('PATCH /courses/:id', () => {
  let courseId: number;

  beforeAll(async () => {
    const [course] = await db
      .insert(courses)
      .values({ code: 'PATCH-TEST', semester: 'Spring 2026', lectureTeacherId: teacherId })
      .returning();
    courseId = course.id;
  });

  it('updates course fields (lecture teacher)', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}`, teacherAuth, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Web Dev Principles', lectureSchedule: 'Mon 10:00-12:00' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Web Dev Principles');
    expect(body.lectureSchedule).toBe('Mon 10:00-12:00');
  });

  it('returns 403 when called by non-TEACHER user', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}`, userAuth, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacked' }),
      })
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown course', async () => {
    const res = await testApp.handle(
      req('http://localhost/courses/999999', teacherAuth, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ghost' }),
      })
    );
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/courses.test.ts
```

Expected: PATCH tests FAIL.

- [ ] **Step 3: Add PATCH /:id to `courses.ts`**

Remove trailing `;` from `.get('/:id')` and append:

```typescript
  .patch(
    '/:id',
    async ({ params, body, user, set }) => {
      if (!(user as AuthUser).roles.includes('TEACHER')) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'TEACHER role required' };
      }
      const [existing] = await db
        .select()
        .from(courses)
        .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
      if (!existing) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Course not found' };
      }
      if (existing.lectureTeacherId !== (user as AuthUser).id) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Only the lecture teacher can update this course' };
      }
      const [updated] = await db
        .update(courses)
        .set({
          ...(body.code !== undefined && { code: body.code }),
          ...(body.name !== undefined && { name: body.name }),
          ...(body.semester !== undefined && { semester: body.semester }),
          ...(body.color !== undefined && { color: body.color }),
          ...(body.lectureSchedule !== undefined && { lectureSchedule: body.lectureSchedule }),
          ...(body.seminarSchedule !== undefined && { seminarSchedule: body.seminarSchedule }),
          ...(body.lectureTeacherId !== undefined && { lectureTeacherId: body.lectureTeacherId }),
          ...(body.seminarTeacherId !== undefined && { seminarTeacherId: body.seminarTeacherId }),
        })
        .where(eq(courses.id, existing.id))
        .returning();
      await logAction(db, (user as AuthUser).id, `Updated course ${existing.id}`);
      return updated;
    },
    {
      body: t.Object({
        code: t.Optional(t.String({ minLength: 1 })),
        name: t.Optional(t.String()),
        semester: t.Optional(t.String({ minLength: 1 })),
        color: t.Optional(t.String()),
        lectureSchedule: t.Optional(t.String()),
        seminarSchedule: t.Optional(t.String()),
        lectureTeacherId: t.Optional(t.Number()),
        seminarTeacherId: t.Optional(t.Number()),
      }),
    }
  );
```

- [ ] **Step 4: Run — expect all PASS**

```bash
bun test src/routes/courses.test.ts
```

Expected: 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/courses.ts apps/backend/src/routes/courses.test.ts
git commit -m "feat: add PATCH /courses/:id with TEACHER ownership check"
```

---

### Task 6: DELETE /courses/:id

**Files:**
- Modify: `apps/backend/src/routes/courses.ts`
- Modify: `apps/backend/src/routes/courses.test.ts`

**Context:** Same role + ownership check as PATCH. Soft-delete only (`deletedAt = new Date()`). Course disappears from GET /courses after delete.

- [ ] **Step 1: Append tests to `courses.test.ts`**

```typescript
describe('DELETE /courses/:id', () => {
  let courseId: number;

  beforeAll(async () => {
    const [course] = await db
      .insert(courses)
      .values({ code: 'DELETE-TEST', semester: 'Spring 2026', lectureTeacherId: teacherId })
      .returning();
    courseId = course.id;
  });

  it('returns 403 for non-TEACHER user', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}`, userAuth, { method: 'DELETE' })
    );
    expect(res.status).toBe(403);
  });

  it('soft-deletes the course and removes it from list', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}`, teacherAuth, { method: 'DELETE' })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    const listRes = await testApp.handle(req('http://localhost/courses', userAuth));
    const list = await listRes.json();
    expect(list.some((c: { id: number }) => c.id === courseId)).toBe(false);
  });

  it('returns 404 for already-deleted course', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}`, teacherAuth, { method: 'DELETE' })
    );
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/courses.test.ts
```

Expected: DELETE tests FAIL.

- [ ] **Step 3: Add DELETE /:id to `courses.ts`**

Remove trailing `;` from `.patch('/:id')` and append:

```typescript
  .delete('/:id', async ({ params, user, set }) => {
    if (!(user as AuthUser).roles.includes('TEACHER')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'TEACHER role required' };
    }
    const [existing] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!existing) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    if (existing.lectureTeacherId !== (user as AuthUser).id) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Only the lecture teacher can delete this course' };
    }
    await db.update(courses).set({ deletedAt: new Date() }).where(eq(courses.id, existing.id));
    await logAction(db, (user as AuthUser).id, `Deleted course ${existing.id}`);
    return { success: true };
  });
```

- [ ] **Step 4: Run — expect all PASS**

```bash
bun test src/routes/courses.test.ts
```

Expected: 14 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/courses.ts apps/backend/src/routes/courses.test.ts
git commit -m "feat: add DELETE /courses/:id with soft delete"
```

---

### Task 7: POST /courses/:id/enroll

**Files:**
- Modify: `apps/backend/src/routes/courses.ts`
- Modify: `apps/backend/src/routes/courses.test.ts`

**Context:** Inserts a `(userId, courseId)` row into `user_courses`. Uses `.onConflictDoNothing()` so re-enrolling is idempotent and always returns 200. 404 if course not found or soft-deleted.

- [ ] **Step 1: Append tests to `courses.test.ts`**

```typescript
describe('POST /courses/:id/enroll', () => {
  let courseId: number;

  beforeAll(async () => {
    const [course] = await db
      .insert(courses)
      .values({ code: 'ENROLL-TEST', semester: 'Spring 2026', lectureTeacherId: teacherId })
      .returning();
    courseId = course.id;
  });

  it('enrolls user and course appears in GET /courses/enrolled', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/enroll`, userAuth, { method: 'POST' })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    const enrolledRes = await testApp.handle(req('http://localhost/courses/enrolled', userAuth));
    const list = await enrolledRes.json();
    expect(list.some((c: { id: number }) => c.id === courseId)).toBe(true);
  });

  it('is idempotent — second enroll returns 200', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/enroll`, userAuth, { method: 'POST' })
    );
    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown course', async () => {
    const res = await testApp.handle(
      req('http://localhost/courses/999999/enroll', userAuth, { method: 'POST' })
    );
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/courses.test.ts
```

Expected: enroll tests FAIL.

- [ ] **Step 3: Add POST /:id/enroll to `courses.ts`**

Remove trailing `;` from `.delete('/:id')` and append:

```typescript
  .post('/:id/enroll', async ({ params, user, set }) => {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    await db
      .insert(userCourses)
      .values({ userId: (user as AuthUser).id, courseId: course.id })
      .onConflictDoNothing();
    return { success: true };
  });
```

- [ ] **Step 4: Run — expect all PASS**

```bash
bun test src/routes/courses.test.ts
```

Expected: 17 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/courses.ts apps/backend/src/routes/courses.test.ts
git commit -m "feat: add POST /courses/:id/enroll with idempotent insert"
```

---

### Task 8: DELETE /courses/:id/enroll

**Files:**
- Modify: `apps/backend/src/routes/courses.ts`
- Modify: `apps/backend/src/routes/courses.test.ts`

**Context:** Hard-deletes the `user_courses` row (junction table rows are not soft-deleted). 404 if course not found/deleted OR if user is not enrolled. Tasks/notes/events with `courseId` are left untouched.

- [ ] **Step 1: Append tests to `courses.test.ts`**

```typescript
describe('DELETE /courses/:id/enroll', () => {
  let courseId: number;

  beforeAll(async () => {
    const [course] = await db
      .insert(courses)
      .values({ code: 'UNENROLL-TEST', semester: 'Spring 2026', lectureTeacherId: teacherId })
      .returning();
    courseId = course.id;
    await db.insert(userCourses).values({ userId, courseId: course.id });
  });

  it('unenrolls user and course disappears from GET /courses/enrolled', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/enroll`, userAuth, { method: 'DELETE' })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    const enrolledRes = await testApp.handle(req('http://localhost/courses/enrolled', userAuth));
    const list = await enrolledRes.json();
    expect(list.some((c: { id: number }) => c.id === courseId)).toBe(false);
  });

  it('returns 404 when not enrolled', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/enroll`, userAuth, { method: 'DELETE' })
    );
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/courses.test.ts
```

Expected: unenroll tests FAIL.

- [ ] **Step 3: Add DELETE /:id/enroll to `courses.ts`**

Remove trailing `;` from `.post('/:id/enroll')` and append:

```typescript
  .delete('/:id/enroll', async ({ params, user, set }) => {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    const deleted = await db
      .delete(userCourses)
      .where(
        and(
          eq(userCourses.courseId, course.id),
          eq(userCourses.userId, (user as AuthUser).id)
        )
      )
      .returning();
    if (deleted.length === 0) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Not enrolled in this course' };
    }
    return { success: true };
  });
```

- [ ] **Step 4: Run — expect all PASS**

```bash
bun test src/routes/courses.test.ts
```

Expected: 19 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/courses.ts apps/backend/src/routes/courses.test.ts
git commit -m "feat: add DELETE /courses/:id/enroll"
```

---

### Task 9: GET /courses/:id/progress

**Files:**
- Modify: `apps/backend/src/routes/courses.ts`
- Modify: `apps/backend/src/routes/courses.test.ts`

**Context:** Fetches all non-deleted tasks for the current user where `courseId = id`. Returns `{ total, done, percent }`. `percent = total === 0 ? 0 : Math.round(done / total * 100)`. The `tasks` table is already imported at the top of `courses.ts`.

- [ ] **Step 1: Append tests to `courses.test.ts`**

```typescript
describe('GET /courses/:id/progress', () => {
  let courseId: number;

  beforeAll(async () => {
    const [course] = await db
      .insert(courses)
      .values({ code: 'PROGRESS-TEST', semester: 'Spring 2026', lectureTeacherId: teacherId })
      .returning();
    courseId = course.id;
    await db.insert(tasks).values([
      { userId, courseId: course.id, title: 'Task 1', dueDate: new Date(), status: 'DONE' },
      { userId, courseId: course.id, title: 'Task 2', dueDate: new Date(), status: 'TODO' },
      { userId, courseId: course.id, title: 'Task 3', dueDate: new Date(), status: 'DONE' },
    ]);
  });

  it('returns correct progress counts', async () => {
    const res = await testApp.handle(req(`http://localhost/courses/${courseId}/progress`, userAuth));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(3);
    expect(body.done).toBe(2);
    expect(body.percent).toBe(67);
  });

  it('returns zero progress when no tasks', async () => {
    const [emptyCourse] = await db
      .insert(courses)
      .values({ code: 'PROGRESS-EMPTY', semester: 'Spring 2026', lectureTeacherId: teacherId })
      .returning();
    const res = await testApp.handle(
      req(`http://localhost/courses/${emptyCourse.id}/progress`, userAuth)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.done).toBe(0);
    expect(body.percent).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/courses.test.ts
```

Expected: progress tests FAIL.

- [ ] **Step 3: Add GET /:id/progress to `courses.ts`**

Remove trailing `;` from `.delete('/:id/enroll')` and append:

```typescript
  .get('/:id/progress', async ({ params, user, set }) => {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    const userTasks = await db
      .select({ status: tasks.status })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, (user as AuthUser).id),
          eq(tasks.courseId, course.id),
          isNull(tasks.deletedAt)
        )
      );
    const total = userTasks.length;
    const done = userTasks.filter((t) => t.status === 'DONE').length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, percent };
  });
```

- [ ] **Step 4: Run — expect all PASS**

```bash
bun test src/routes/courses.test.ts
```

Expected: 21 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/courses.ts apps/backend/src/routes/courses.test.ts
git commit -m "feat: add GET /courses/:id/progress"
```

---

### Task 10: Register routes in index.ts + full suite

**Files:**
- Modify: `apps/backend/src/index.ts`

- [ ] **Step 1: Update `apps/backend/src/index.ts`**

```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authMiddleware } from './middleware/auth';
import { tasksRoutes } from './routes/tasks';
import { eventsRoutes } from './routes/events';
import { foldersRoutes } from './routes/folders';
import { notesRoutes } from './routes/notes';
import { coursesRoutes } from './routes/courses';

const PORT = process.env.PORT ?? 3001;

const app = new Elysia()
  .use(cors())
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))
  .use(authMiddleware)
  .use(tasksRoutes)
  .use(eventsRoutes)
  .use(foldersRoutes)
  .use(notesRoutes)
  .use(coursesRoutes)
  .listen(PORT);

console.log(`Backend running at http://localhost:${PORT}`);

export type App = typeof app;
```

- [ ] **Step 2: Run the full suite**

```bash
cd apps/backend
bun test
```

Expected: all tests pass — tasks (16), events (15), folders (10), notes (13), courses (~21) = 75+ tests across 8 files.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/index.ts
git commit -m "feat: register coursesRoutes in main app"
```
