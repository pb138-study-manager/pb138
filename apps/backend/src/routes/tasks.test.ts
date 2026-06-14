import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../db';
import { tasks, users, auditLogs, evals, roles, userRoles } from '../db/schema';
import { tasksRoutes } from './tasks';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';

const RND = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const TEST_SECRET = process.env.SUPABASE_JWT_SECRET || 'tasks-test-jwt-secret';
const TEST_AUTH_ID = `tasks-test-uuid-${RND}`;
process.env.SUPABASE_JWT_SECRET = TEST_SECRET;

async function makeAuthHeader(): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  const token = await new SignJWT({ sub: TEST_AUTH_ID })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
  return `Bearer ${token}`;
}

let testUserId: number;
let authHeader: string;
const testApp = new Elysia().use(tasksRoutes);

// Wraps Request with Authorization header so every test is authenticated
async function req(url: string, init: RequestInit = {}): Promise<Request> {
  return new Request(url, {
    ...init,
    headers: { Authorization: authHeader, ...init.headers },
  });
}

beforeAll(async () => {
  authHeader = await makeAuthHeader();

  // Clean up any leftover state from a previously failed run.
  const [stale] = await db.select({ id: users.id }).from(users).where(eq(users.authId, TEST_AUTH_ID));
  if (stale) {
    const staleTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, stale.id));
    for (const t of staleTasks) {
      await db.delete(evals).where(eq(evals.taskId, t.id));
    }
    await db.delete(tasks).where(eq(tasks.userId, stale.id));
    await db.delete(auditLogs).where(eq(auditLogs.actorId, stale.id));
    await db.delete(users).where(eq(users.id, stale.id));
  }

  const [user] = await db
    .insert(users)
    .values({
      email: `tasks-test-${RND}@example.com`,
      login: `tasks-test-user-${RND}`,
      pwdHash: '',
      authId: TEST_AUTH_ID,
    })
    .returning();
  testUserId = user.id;
});

afterAll(async () => {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, testUserId));
  const userTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, testUserId));
  for (const t of userTasks) {
    await db.delete(evals).where(eq(evals.taskId, t.id));
  }
  await db.delete(tasks).where(eq(tasks.userId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));
});

describe('GET /tasks', () => {
  it('returns empty array when user has no tasks', async () => {
    const res = await testApp.handle(await req('http://localhost/tasks'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('returns tasks belonging to the user', async () => {
    await db.insert(tasks).values({ userId: testUserId, title: 'Test task', dueDate: new Date('2026-12-31') });
    const res = await testApp.handle(await req('http://localhost/tasks'));
    const body = await res.json();
    expect(body.some((t: { title: string }) => t.title === 'Test task')).toBe(true);
  });
});

describe('POST /tasks', () => {
  it('creates a task and returns it', async () => {
    const res = await testApp.handle(
      await req('http://localhost/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New task', dueDate: '2026-12-31T00:00:00.000Z' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('New task');
    expect(body.status).toBe('TODO');
    expect(body.userId).toBe(testUserId);
  });

  it('returns 400 when title is missing', async () => {
    const res = await testApp.handle(
      await req('http://localhost/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: '2026-12-31T00:00:00.000Z' }),
      })
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /tasks with parentId', () => {
  let parentTaskId: number;

  beforeAll(async () => {
    const [parent] = await db
      .insert(tasks)
      .values({ userId: testUserId, title: 'Parent task', dueDate: new Date('2026-12-31') })
      .returning();
    parentTaskId = parent.id;
  });

  it('creates a subtask linked to parent', async () => {
    const res = await testApp.handle(
      await req('http://localhost/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Subtask',
          dueDate: '2026-12-31T00:00:00.000Z',
          parentId: parentTaskId,
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parentId).toBe(parentTaskId);
  });

  it('returns 404 when parentId does not exist', async () => {
    const res = await testApp.handle(
      await req('http://localhost/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Bad subtask',
          dueDate: '2026-12-31T00:00:00.000Z',
          parentId: 999999,
        }),
      })
    );
    expect(res.status).toBe(404);
  });
});

describe('GET /tasks top-level only', () => {
  it('does not return subtasks in the list', async () => {
    const [parent] = await db
      .insert(tasks)
      .values({ userId: testUserId, title: 'Parent for list test', dueDate: new Date('2026-12-31') })
      .returning();
    await db.insert(tasks).values({
      userId: testUserId,
      title: 'Child for list test',
      dueDate: new Date('2026-12-31'),
      parentId: parent.id,
    });

    const res = await testApp.handle(await req('http://localhost/tasks'));
    const body = await res.json();
    const childInList = body.some((t: { title: string }) => t.title === 'Child for list test');
    expect(childInList).toBe(false);
  });
});

describe('PATCH /tasks/:id', () => {
  let taskId: number;

  beforeAll(async () => {
    const [task] = await db
      .insert(tasks)
      .values({ userId: testUserId, title: 'Task to update', dueDate: new Date('2026-12-31') })
      .returning();
    taskId = task.id;
  });

  it('updates title and returns updated task', async () => {
    const res = await testApp.handle(
      await req(`http://localhost/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated title' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Updated title');
  });

  it('returns 404 when task does not belong to user', async () => {
    const res = await testApp.handle(
      await req('http://localhost/tasks/999999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hacked' }),
      })
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /tasks/:id', () => {
  let taskId: number;

  beforeAll(async () => {
    const [task] = await db
      .insert(tasks)
      .values({ userId: testUserId, title: 'Task to delete', dueDate: new Date('2026-12-31') })
      .returning();
    taskId = task.id;
  });

  it('soft-deletes the task and removes it from list', async () => {
    const res = await testApp.handle(await req(`http://localhost/tasks/${taskId}`, { method: 'DELETE' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const listRes = await testApp.handle(await req('http://localhost/tasks'));
    const list = await listRes.json();
    expect(list.some((t: { id: number }) => t.id === taskId)).toBe(false);
  });

  it('returns 404 when task does not belong to user', async () => {
    const res = await testApp.handle(await req('http://localhost/tasks/999999', { method: 'DELETE' }));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/toggle-done', () => {
  let taskId: number;

  beforeAll(async () => {
    const [task] = await db
      .insert(tasks)
      .values({ userId: testUserId, title: 'Task to toggle', dueDate: new Date('2026-12-31'), status: 'TODO' })
      .returning();
    taskId = task.id;
  });

  it('toggles TODO → DONE', async () => {
    const res = await testApp.handle(await req(`http://localhost/tasks/${taskId}/toggle-done`, { method: 'PATCH' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('DONE');
  });

  it('toggles DONE → TODO', async () => {
    const res = await testApp.handle(await req(`http://localhost/tasks/${taskId}/toggle-done`, { method: 'PATCH' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('TODO');
  });

  it('returns 404 when task does not belong to user', async () => {
    const res = await testApp.handle(await req('http://localhost/tasks/999999/toggle-done', { method: 'PATCH' }));
    expect(res.status).toBe(404);
  });
});

describe('POST /tasks/:id/eval', () => {
  let evalTaskId: number;
  let evalTeacherUserId: number;
  let teacherToken: string;
  const TEACHER_AUTH = `tasks-eval-teacher-uuid-${RND}`;

  beforeAll(async () => {
    // Clean up any leftover data from previous runs
    const [staleTeacher] = await db.select().from(users).where(eq(users.authId, TEACHER_AUTH));
    if (staleTeacher) {
      const staleTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, staleTeacher.id));
      for (const t of staleTasks) {
        await db.delete(evals).where(eq(evals.taskId, t.id));
      }
      await db.delete(tasks).where(eq(tasks.userId, staleTeacher.id));
      await db.delete(auditLogs).where(eq(auditLogs.actorId, staleTeacher.id));
      await db.delete(userRoles).where(eq(userRoles.userId, staleTeacher.id));
      await db.delete(users).where(eq(users.id, staleTeacher.id));
    }

    const [task] = await db
      .insert(tasks)
      .values({ userId: testUserId, title: 'Eval task', dueDate: new Date(), status: 'DONE' })
      .returning();
    evalTaskId = task.id;

    const [teacher] = await db
      .insert(users)
      .values({ 
        email: `eval-teacher-${RND}@example.com`, 
        login: `eval-teacher-login-${RND}`, 
        pwdHash: '', 
        authId: TEACHER_AUTH 
      })
      .returning();
    evalTeacherUserId = teacher.id;

    const [role] = await db.select().from(roles).where(eq(roles.name, 'TEACHER'));
    if (role) await db.insert(userRoles).values({ userId: evalTeacherUserId, roleId: role.id });

    const secret = new TextEncoder().encode(TEST_SECRET);
    const token = await new SignJWT({ sub: TEACHER_AUTH })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);
    teacherToken = `Bearer ${token}`;
  });

  afterAll(async () => {
    if (evalTaskId) await db.delete(evals).where(eq(evals.taskId, evalTaskId));
    if (evalTaskId) await db.delete(tasks).where(eq(tasks.id, evalTaskId));
    if (evalTeacherUserId) await db.delete(auditLogs).where(eq(auditLogs.actorId, evalTeacherUserId));
    if (evalTeacherUserId) await db.delete(userRoles).where(eq(userRoles.userId, evalTeacherUserId));
    if (evalTeacherUserId) await db.delete(users).where(eq(users.id, evalTeacherUserId));
  });

  it('returns 403 for non-teacher', async () => {
    const res = await testApp.handle(
      await req(`http://localhost/tasks/${evalTaskId}/eval`, {
        method: 'POST',
        body: JSON.stringify({ score: 5, feedback: 'Good' }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(res.status).toBe(403);
  });

  it('creates eval for a DONE task', async () => {
    const res = await testApp.handle(
      new Request(`http://localhost/tasks/${evalTaskId}/eval`, {
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
      .values({ userId: testUserId, title: 'Not done task for eval', dueDate: new Date(), status: 'TODO' })
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
  let evalTaskId2: number;
  let evalTeacherUserId2: number;
  let teacherToken2: string;
  const TEACHER_AUTH2 = `tasks-eval-teacher-uuid-2-${RND}`;

  beforeAll(async () => {
    // Clean up any leftover data from previous runs
    const [staleTeacher2] = await db.select().from(users).where(eq(users.authId, TEACHER_AUTH2));
    if (staleTeacher2) {
      const staleTasks2 = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, staleTeacher2.id));
      for (const t of staleTasks2) {
        await db.delete(evals).where(eq(evals.taskId, t.id));
      }
      await db.delete(tasks).where(eq(tasks.userId, staleTeacher2.id));
      await db.delete(auditLogs).where(eq(auditLogs.actorId, staleTeacher2.id));
      await db.delete(userRoles).where(eq(userRoles.userId, staleTeacher2.id));
      await db.delete(users).where(eq(users.id, staleTeacher2.id));
    }

    const [task] = await db
      .insert(tasks)
      .values({ userId: testUserId, title: 'Eval GET task', dueDate: new Date(), status: 'DONE' })
      .returning();
    evalTaskId2 = task.id;
    await db.insert(evals).values({ taskId: evalTaskId2, score: 9, feedback: 'Excellent' });

    const [teacher] = await db
      .insert(users)
      .values({
        email: `eval-teacher2-${RND}@example.com`,
        login: `eval-teacher-login-2-${RND}`,
        pwdHash: '',
        authId: TEACHER_AUTH2,
      })
      .returning();
    evalTeacherUserId2 = teacher.id;

    const [role] = await db.select().from(roles).where(eq(roles.name, 'TEACHER'));
    if (role) await db.insert(userRoles).values({ userId: evalTeacherUserId2, roleId: role.id });

    const secret = new TextEncoder().encode(TEST_SECRET);
    const token = await new SignJWT({ sub: TEACHER_AUTH2 })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);
    teacherToken2 = `Bearer ${token}`;
  });

  afterAll(async () => {
    if (evalTaskId2) await db.delete(evals).where(eq(evals.taskId, evalTaskId2));
    if (evalTaskId2) await db.delete(tasks).where(eq(tasks.id, evalTaskId2));
    if (evalTeacherUserId2) await db.delete(auditLogs).where(eq(auditLogs.actorId, evalTeacherUserId2));
    if (evalTeacherUserId2) await db.delete(userRoles).where(eq(userRoles.userId, evalTeacherUserId2));
    if (evalTeacherUserId2) await db.delete(users).where(eq(users.id, evalTeacherUserId2));
  });

  it('returns eval for task owner', async () => {
    const res = await testApp.handle(await req(`http://localhost/tasks/${evalTaskId2}/eval`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(9);
    expect(body.feedback).toBe('Excellent');
  });

  it('returns eval for teacher', async () => {
    const res = await testApp.handle(
      new Request(`http://localhost/tasks/${evalTaskId2}/eval`, {
        headers: { Authorization: teacherToken2 },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(9);
  });

  it('returns 404 for nonexistent task', async () => {
    const res = await testApp.handle(await req('http://localhost/tasks/999999/eval'));
    expect(res.status).toBe(404);
  });
});
