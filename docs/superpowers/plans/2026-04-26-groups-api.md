# Groups API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 8 endpoints under `/groups` covering group creation with auto-typed SEMINAR/GROUP, member management, and assignment creation that fans out into one task per member.

**Architecture:** Single route file `routes/groups.ts` registered in `index.ts`. Group type (`SEMINAR` | `GROUP`) is set at creation from the creator's role (already in `AuthUser.roles`) and never changes. Mentor = creator (`groups.mentorId`); all write operations check this. Assignment creation inserts one `tasks` row per current `group_members` entry.

**Tech Stack:** ElysiaJS, Drizzle ORM, Bun test, PostgreSQL

---

## File Map

| File | Action |
|---|---|
| `apps/backend/src/db/schema.ts` | Add `groupTypeEnum`; add `type` column to `groups` table |
| `apps/backend/drizzle/` | New migration (generated + applied) |
| `apps/backend/src/routes/groups.ts` | Create — 8 endpoints |
| `apps/backend/src/routes/groups.test.ts` | Create — 13 tests |
| `apps/backend/src/index.ts` | Add `import + .use(groupsRoutes)` |

---

### Task 1: Add groupTypeEnum to schema + migration

**Files:**
- Modify: `apps/backend/src/db/schema.ts`
- Generate: `apps/backend/drizzle/` (new migration file)

- [ ] **Step 1: Add enum and column to `schema.ts`**

In `apps/backend/src/db/schema.ts`, after line 18 (after `taskStatusEnum`), add:

```typescript
export const groupTypeEnum = pgEnum('group_type', ['SEMINAR', 'GROUP']);
```

Also add `groupTypeEnum` to the existing `groups` table definition (currently at line ~101). The full updated table should be:

```typescript
export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  mentorId: integer('mentor_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  type: groupTypeEnum('type').notNull().default('GROUP'),
  deletedAt: timestamp('deleted_at'),
});
```

- [ ] **Step 2: Generate migration**

```bash
cd apps/backend
bun run db:generate
```

Expected: new file created in `drizzle/` (e.g. `0006_add_group_type.sql`).

- [ ] **Step 3: Apply migration**

```bash
bun run db:migrate
```

Expected: migration applied successfully, no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/db/schema.ts apps/backend/drizzle/
git commit -m "feat: add groupTypeEnum and type column to groups table"
```

---

### Task 2: Scaffold groups test + GET /groups

**Files:**
- Create: `apps/backend/src/routes/groups.test.ts`
- Create: `apps/backend/src/routes/groups.ts`

- [ ] **Step 1: Create `groups.test.ts` with scaffold + GET /groups test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../db';
import {
  users, userRoles, roles, groups, groupMembers, assignments, tasks, auditLogs,
} from '../db/schema';
import { groupsRoutes } from './groups';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';

const TEST_SECRET = 'groups-test-jwt-secret';
const USER_AUTH_ID = 'groups-test-user-uuid';
const TEACHER_AUTH_ID = 'groups-test-teacher-uuid';
process.env.SUPABASE_JWT_SECRET = TEST_SECRET;

async function makeToken(authId: string): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  return new SignJWT({ sub: authId })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
}

let userId: number;
let teacherId: number;
let userAuth: string;
let teacherAuth: string;
let testApp: Elysia;
let userGroupId: number;
let teacherGroupId: number;

function req(url: string, auth: string, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: { Authorization: auth, ...init.headers },
  });
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email: 'groups-user@example.com', login: 'groups-test-user', pwdHash: '', authId: USER_AUTH_ID })
    .returning();
  userId = user.id;

  const [teacher] = await db
    .insert(users)
    .values({ email: 'groups-teacher@example.com', login: 'groups-test-teacher', pwdHash: '', authId: TEACHER_AUTH_ID })
    .returning();
  teacherId = teacher.id;

  await db.insert(roles).values({ name: 'TEACHER' }).onConflictDoNothing();
  const [teacherRole] = await db.select().from(roles).where(eq(roles.name, 'TEACHER'));
  await db.insert(userRoles).values({ userId: teacherId, roleId: teacherRole.id });

  userAuth = `Bearer ${await makeToken(USER_AUTH_ID)}`;
  teacherAuth = `Bearer ${await makeToken(TEACHER_AUTH_ID)}`;
  testApp = new Elysia().use(groupsRoutes);
});

afterAll(async () => {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, userId));
  await db.delete(auditLogs).where(eq(auditLogs.actorId, teacherId));
  // tasks assigned via assignments
  if (teacherGroupId) {
    const assignmentRows = await db.select({ id: assignments.id }).from(assignments).where(eq(assignments.groupId, teacherGroupId));
    for (const a of assignmentRows) {
      await db.delete(tasks).where(eq(tasks.assignmentId, a.id));
    }
    await db.delete(assignments).where(eq(assignments.groupId, teacherGroupId));
    await db.delete(groupMembers).where(eq(groupMembers.groupId, teacherGroupId));
  }
  if (userGroupId) {
    await db.delete(groupMembers).where(eq(groupMembers.groupId, userGroupId));
  }
  await db.delete(groups).where(eq(groups.mentorId, teacherId));
  await db.delete(groups).where(eq(groups.mentorId, userId));
  await db.delete(userRoles).where(eq(userRoles.userId, teacherId));
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(users).where(eq(users.id, teacherId));
});

describe('GET /groups', () => {
  it('returns empty array for user with no groups', async () => {
    const res = await testApp.handle(req('http://localhost/groups', userAuth));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module not found)**

```bash
cd apps/backend
bun test src/routes/groups.test.ts
```

Expected: FAIL — `Cannot find module './groups'`

- [ ] **Step 3: Create `apps/backend/src/routes/groups.ts` with GET /**

```typescript
import { Elysia, t } from 'elysia';
import { db } from '../db';
import {
  groups, groupMembers, assignments, tasks, users,
} from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, inArray, or } from 'drizzle-orm';

export const groupsRoutes = new Elysia({ prefix: '/groups' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', async ({ user }) => {
    const uid = (user as AuthUser).id;

    const memberRows = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, uid));
    const memberGroupIds = memberRows.map((r) => r.groupId);

    return db
      .select({
        id: groups.id,
        name: groups.name,
        type: groups.type,
        mentorId: groups.mentorId,
        deletedAt: groups.deletedAt,
      })
      .from(groups)
      .where(
        and(
          isNull(groups.deletedAt),
          memberGroupIds.length > 0
            ? or(eq(groups.mentorId, uid), inArray(groups.id, memberGroupIds))
            : eq(groups.mentorId, uid)
        )
      );
  });
```

- [ ] **Step 4: Run — expect 1 PASS**

```bash
bun test src/routes/groups.test.ts
```

Expected: 1 test PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/groups.ts apps/backend/src/routes/groups.test.ts
git commit -m "feat: scaffold groups routes and add GET /groups"
```

---

### Task 3: POST /groups

**Files:**
- Modify: `apps/backend/src/routes/groups.ts`
- Modify: `apps/backend/src/routes/groups.test.ts`

- [ ] **Step 1: Append tests to `groups.test.ts`**

```typescript
describe('POST /groups', () => {
  it('regular user creates a GROUP', async () => {
    const res = await testApp.handle(
      req('http://localhost/groups', userAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Group' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe('GROUP');
    expect(body.mentorId).toBe(userId);
    expect(body.name).toBe('Test Group');
    userGroupId = body.id;
  });

  it('TEACHER creates a SEMINAR', async () => {
    const res = await testApp.handle(
      req('http://localhost/groups', teacherAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Seminar' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe('SEMINAR');
    expect(body.mentorId).toBe(teacherId);
    teacherGroupId = body.id;
  });

  it('GET /groups returns created group for mentor', async () => {
    const res = await testApp.handle(req('http://localhost/groups', userAuth));
    const body = await res.json();
    expect(body.some((g: { id: number }) => g.id === userGroupId)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/groups.test.ts
```

Expected: POST tests FAIL with 404.

- [ ] **Step 3: Append POST / to `groups.ts`**

Remove the trailing `;` from `.get('/')` and append:

```typescript
  .post(
    '/',
    async ({ body, user }) => {
      const uid = (user as AuthUser).id;
      const isTeacher = (user as AuthUser).roles.includes('TEACHER');
      const type = isTeacher ? ('SEMINAR' as const) : ('GROUP' as const);
      const [group] = await db
        .insert(groups)
        .values({ name: body.name, mentorId: uid, type })
        .returning();
      await logAction(db, uid, `Created group ${group.id}: ${group.name}`);
      return group;
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
      }),
    }
  );
```

- [ ] **Step 4: Run — expect 4 PASS**

```bash
bun test src/routes/groups.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/groups.ts apps/backend/src/routes/groups.test.ts
git commit -m "feat: add POST /groups with auto SEMINAR/GROUP type"
```

---

### Task 4: GET /groups/:id

**Files:**
- Modify: `apps/backend/src/routes/groups.ts`
- Modify: `apps/backend/src/routes/groups.test.ts`

- [ ] **Step 1: Append tests to `groups.test.ts`**

```typescript
describe('GET /groups/:id', () => {
  it('returns group detail with members array for mentor', async () => {
    const res = await testApp.handle(req(`http://localhost/groups/${userGroupId}`, userAuth));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(userGroupId);
    expect(body.name).toBe('Test Group');
    expect(Array.isArray(body.members)).toBe(true);
  });

  it('returns 403 for user who is neither mentor nor member', async () => {
    const res = await testApp.handle(req(`http://localhost/groups/${teacherGroupId}`, userAuth));
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/groups.test.ts
```

Expected: GET /:id tests FAIL with 404.

- [ ] **Step 3: Append GET /:id to `groups.ts`**

Remove the trailing `;` from `.post('/')` and append:

```typescript
  .get('/:id', async ({ params, user, set }) => {
    const uid = (user as AuthUser).id;
    const groupId = parseInt(params.id);

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

    if (!group) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Group not found' };
    }

    const isMentor = group.mentorId === uid;
    if (!isMentor) {
      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, uid)));
      if (!membership) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Access denied' };
      }
    }

    const members = await db
      .select({ id: users.id, login: users.login, email: users.email })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));

    return { ...group, members };
  });
```

- [ ] **Step 4: Run — expect 6 PASS**

```bash
bun test src/routes/groups.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/groups.ts apps/backend/src/routes/groups.test.ts
git commit -m "feat: add GET /groups/:id with member list and access control"
```

---

### Task 5: DELETE /groups/:id

**Files:**
- Modify: `apps/backend/src/routes/groups.ts`
- Modify: `apps/backend/src/routes/groups.test.ts`

- [ ] **Step 1: Append tests to `groups.test.ts`**

```typescript
describe('DELETE /groups/:id', () => {
  it('returns 403 when non-mentor tries to delete', async () => {
    const res = await testApp.handle(
      req(`http://localhost/groups/${teacherGroupId}`, userAuth, { method: 'DELETE' })
    );
    expect(res.status).toBe(403);
  });

  it('mentor can soft-delete own group', async () => {
    // Create a throwaway group to delete
    const createRes = await testApp.handle(
      req('http://localhost/groups', userAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Throwaway Group' }),
      })
    );
    const { id: throwawayId } = await createRes.json();

    const res = await testApp.handle(
      req(`http://localhost/groups/${throwawayId}`, userAuth, { method: 'DELETE' })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    // Confirm it no longer appears in GET /groups
    const listRes = await testApp.handle(req('http://localhost/groups', userAuth));
    const list = await listRes.json();
    expect(list.some((g: { id: number }) => g.id === throwawayId)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/groups.test.ts
```

Expected: DELETE tests FAIL with 404.

- [ ] **Step 3: Append DELETE /:id to `groups.ts`**

Remove the trailing `;` from `.get('/:id')` and append:

```typescript
  .delete('/:id', async ({ params, user, set }) => {
    const uid = (user as AuthUser).id;
    const groupId = parseInt(params.id);

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

    if (!group) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Group not found' };
    }
    if (group.mentorId !== uid) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Only the group mentor can delete this group' };
    }

    await db.update(groups).set({ deletedAt: new Date() }).where(eq(groups.id, groupId));
    await logAction(db, uid, `Deleted group ${groupId}`);
    return { success: true };
  });
```

- [ ] **Step 4: Run — expect 8 PASS**

```bash
bun test src/routes/groups.test.ts
```

Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/groups.ts apps/backend/src/routes/groups.test.ts
git commit -m "feat: add DELETE /groups/:id with mentor-only soft delete"
```

---

### Task 6: POST + DELETE /groups/:id/members

**Files:**
- Modify: `apps/backend/src/routes/groups.ts`
- Modify: `apps/backend/src/routes/groups.test.ts`

- [ ] **Step 1: Append tests to `groups.test.ts`**

```typescript
describe('POST /groups/:id/members', () => {
  it('mentor can add members', async () => {
    const res = await testApp.handle(
      req(`http://localhost/groups/${teacherGroupId}/members`, teacherAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    // Member now appears in group detail
    const detail = await testApp.handle(req(`http://localhost/groups/${teacherGroupId}`, teacherAuth));
    const body = await detail.json();
    expect(body.members.some((m: { id: number }) => m.id === userId)).toBe(true);
  });

  it('non-mentor gets 403 when adding members', async () => {
    const res = await testApp.handle(
      req(`http://localhost/groups/${teacherGroupId}/members`, userAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      })
    );
    expect(res.status).toBe(403);
  });
});

describe('DELETE /groups/:id/members/:userId', () => {
  it('returns 404 when user is not a member', async () => {
    const res = await testApp.handle(
      req(`http://localhost/groups/${userGroupId}/members/${teacherId}`, userAuth, { method: 'DELETE' })
    );
    expect(res.status).toBe(404);
  });

  it('mentor can remove a member', async () => {
    // Add userId to teacherGroupId first (already done in previous test block)
    const res = await testApp.handle(
      req(`http://localhost/groups/${teacherGroupId}/members/${userId}`, teacherAuth, { method: 'DELETE' })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    // Confirm removed
    const detail = await testApp.handle(req(`http://localhost/groups/${teacherGroupId}`, teacherAuth));
    const body = await detail.json();
    expect(body.members.some((m: { id: number }) => m.id === userId)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/groups.test.ts
```

Expected: member management tests FAIL with 404.

- [ ] **Step 3: Append POST + DELETE /:id/members to `groups.ts`**

Remove the trailing `;` from `.delete('/:id')` and append:

```typescript
  .post(
    '/:id/members',
    async ({ params, body, user, set }) => {
      const uid = (user as AuthUser).id;
      const groupId = parseInt(params.id);

      const [group] = await db
        .select()
        .from(groups)
        .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

      if (!group) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Group not found' };
      }
      if (group.mentorId !== uid) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Only the group mentor can add members' };
      }

      await db
        .insert(groupMembers)
        .values(body.userIds.map((memberId) => ({ userId: memberId, groupId })))
        .onConflictDoNothing();
      await logAction(db, uid, `Added members to group ${groupId}`);
      return { success: true };
    },
    {
      body: t.Object({
        userIds: t.Array(t.Number()),
      }),
    }
  )
  .delete('/:id/members/:userId', async ({ params, user, set }) => {
    const uid = (user as AuthUser).id;
    const groupId = parseInt(params.id);
    const targetUserId = parseInt(params.userId);

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

    if (!group) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Group not found' };
    }
    if (group.mentorId !== uid) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Only the group mentor can remove members' };
    }

    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)));

    if (!membership) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'User is not a member of this group' };
    }

    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)));
    await logAction(db, uid, `Removed user ${targetUserId} from group ${groupId}`);
    return { success: true };
  });
```

- [ ] **Step 4: Run — expect 12 PASS**

```bash
bun test src/routes/groups.test.ts
```

Expected: 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/groups.ts apps/backend/src/routes/groups.test.ts
git commit -m "feat: add POST + DELETE /groups/:id/members"
```

---

### Task 7: GET + POST /groups/:id/assignments

**Files:**
- Modify: `apps/backend/src/routes/groups.ts`
- Modify: `apps/backend/src/routes/groups.test.ts`

- [ ] **Step 1: Append tests to `groups.test.ts`**

```typescript
describe('GET /groups/:id/assignments', () => {
  it('returns empty array when group has no assignments', async () => {
    const res = await testApp.handle(
      req(`http://localhost/groups/${teacherGroupId}/assignments`, teacherAuth)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });
});

describe('POST /groups/:id/assignments', () => {
  it('non-mentor gets 403', async () => {
    const res = await testApp.handle(
      req(`http://localhost/groups/${teacherGroupId}/assignments`, userAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Lab 1', dueDate: '2026-05-01T23:59:00.000Z' }),
      })
    );
    expect(res.status).toBe(403);
  });

  it('mentor creates assignment and tasks for all members', async () => {
    // Add userId as member first
    await testApp.handle(
      req(`http://localhost/groups/${teacherGroupId}/members`, teacherAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      })
    );

    const res = await testApp.handle(
      req(`http://localhost/groups/${teacherGroupId}/assignments`, teacherAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Lab 1', dueDate: '2026-05-01T23:59:00.000Z', description: 'First lab' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assignment.title).toBe('Lab 1');
    expect(body.tasksCreated).toBe(1); // one member
    expect(body.assignment.groupId).toBe(teacherGroupId);
  });

  it('GET /groups/:id/assignments now shows the created assignment', async () => {
    const res = await testApp.handle(
      req(`http://localhost/groups/${teacherGroupId}/assignments`, teacherAuth)
    );
    const body = await res.json();
    expect(body.length).toBe(1);
    expect(body[0].title).toBe('Lab 1');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test src/routes/groups.test.ts
```

Expected: assignment tests FAIL with 404.

- [ ] **Step 3: Append GET + POST /:id/assignments to `groups.ts`**

Remove the trailing `;` from `.delete('/:id/members/:userId')` and append:

```typescript
  .get('/:id/assignments', async ({ params, user, set }) => {
    const uid = (user as AuthUser).id;
    const groupId = parseInt(params.id);

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

    if (!group) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Group not found' };
    }

    const isMentor = group.mentorId === uid;
    if (!isMentor) {
      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, uid)));
      if (!membership) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Access denied' };
      }
    }

    return db
      .select()
      .from(assignments)
      .where(and(eq(assignments.groupId, groupId), isNull(assignments.deletedAt)));
  })
  .post(
    '/:id/assignments',
    async ({ params, body, user, set }) => {
      const uid = (user as AuthUser).id;
      const groupId = parseInt(params.id);

      const [group] = await db
        .select()
        .from(groups)
        .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

      if (!group) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Group not found' };
      }
      if (group.mentorId !== uid) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Only the group mentor can create assignments' };
      }

      const [assignment] = await db
        .insert(assignments)
        .values({
          groupId,
          title: body.title,
          description: body.description,
          dueDate: new Date(body.dueDate),
        })
        .returning();

      const memberRows = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, groupId));

      if (memberRows.length > 0) {
        await db.insert(tasks).values(
          memberRows.map((m) => ({
            userId: m.userId,
            assignmentId: assignment.id,
            title: body.title,
            description: body.description,
            dueDate: new Date(body.dueDate),
          }))
        );
      }

      await logAction(db, uid, `Created assignment ${assignment.id} for group ${groupId}`);
      return { assignment, tasksCreated: memberRows.length };
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        dueDate: t.String(),
        description: t.Optional(t.String()),
      }),
    }
  );
```

- [ ] **Step 4: Run — expect 16 PASS**

```bash
bun test src/routes/groups.test.ts
```

Expected: 16 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routes/groups.ts apps/backend/src/routes/groups.test.ts
git commit -m "feat: add GET + POST /groups/:id/assignments with per-member task creation"
```

---

### Task 8: Register groupsRoutes in index.ts + full suite

**Files:**
- Modify: `apps/backend/src/index.ts`

- [ ] **Step 1: Register `groupsRoutes` in `index.ts`**

```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authMiddleware } from './middleware/auth';
import { tasksRoutes } from './routes/tasks';
import { eventsRoutes } from './routes/events';
import { foldersRoutes } from './routes/folders';
import { notesRoutes } from './routes/notes';
import { coursesRoutes } from './routes/courses';
import { usersRoutes } from './routes/users';
import { groupsRoutes } from './routes/groups';

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
  .use(usersRoutes)
  .use(groupsRoutes)
  .listen(PORT);

console.log(`Backend running at http://localhost:${PORT}`);

export type App = typeof app;
```

- [ ] **Step 2: Run full test suite**

```bash
cd apps/backend
bun test
```

Expected: all tests pass — tasks (16), events (15), folders (10), notes (13), courses (23), users (13), groups (16) = 106+ tests across 10 files.

- [ ] **Step 3: Run lint**

```bash
cd apps/backend
pnpm lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/index.ts
git commit -m "feat: register groupsRoutes in main app"
```
