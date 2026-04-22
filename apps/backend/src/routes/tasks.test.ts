import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../db';
import { tasks, users, auditLogs } from '../db/schema';
import { tasksRoutes } from './tasks';
import { eq } from 'drizzle-orm';
import type { AuthUser } from '../middleware/auth';

let testUserId: number;
let testApp: Elysia;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: 'tasks-test@example.com',
      login: 'tasks-test-user',
      pwdHash: '',
      authId: 'tasks-test-supabase-uuid',
    })
    .returning();
  testUserId = user.id;

  // Inject a fake authenticated user — bypasses JWT verification for route tests
  testApp = new Elysia()
    .derive(() => ({ user: { id: testUserId, roles: ['USER'] } as AuthUser | null }))
    .as('global')
    .use(tasksRoutes);
});

afterAll(async () => {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, testUserId));
  await db.delete(tasks).where(eq(tasks.userId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));
});

describe('GET /tasks', () => {
  it('returns empty array when user has no tasks', async () => {
    const res = await testApp.handle(new Request('http://localhost/tasks'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('returns tasks belonging to the user', async () => {
    await db.insert(tasks).values({
      userId: testUserId,
      title: 'Test task',
      dueDate: new Date('2026-12-31'),
    });

    const res = await testApp.handle(new Request('http://localhost/tasks'));
    const body = await res.json();
    expect(body.some((t: { title: string }) => t.title === 'Test task')).toBe(true);
  });
});

describe('POST /tasks', () => {
  it('creates a task and returns it', async () => {
    const res = await testApp.handle(
      new Request('http://localhost/tasks', {
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

  it('returns 422 when title is missing', async () => {
    const res = await testApp.handle(
      new Request('http://localhost/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: '2026-12-31T00:00:00.000Z' }),
      })
    );
    expect(res.status).toBe(422);
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
      new Request(`http://localhost/tasks/${taskId}`, {
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
      new Request('http://localhost/tasks/999999', {
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
    const res = await testApp.handle(
      new Request(`http://localhost/tasks/${taskId}`, { method: 'DELETE' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const listRes = await testApp.handle(new Request('http://localhost/tasks'));
    const list = await listRes.json();
    expect(list.some((t: { id: number }) => t.id === taskId)).toBe(false);
  });

  it('returns 404 when task does not belong to user', async () => {
    const res = await testApp.handle(
      new Request('http://localhost/tasks/999999', { method: 'DELETE' })
    );
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/toggle-done', () => {
  let taskId: number;

  beforeAll(async () => {
    const [task] = await db
      .insert(tasks)
      .values({
        userId: testUserId,
        title: 'Task to toggle',
        dueDate: new Date('2026-12-31'),
        status: 'TODO',
      })
      .returning();
    taskId = task.id;
  });

  it('toggles TODO → DONE', async () => {
    const res = await testApp.handle(
      new Request(`http://localhost/tasks/${taskId}/toggle-done`, { method: 'PATCH' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('DONE');
  });

  it('toggles DONE → TODO', async () => {
    const res = await testApp.handle(
      new Request(`http://localhost/tasks/${taskId}/toggle-done`, { method: 'PATCH' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('TODO');
  });

  it('returns 404 when task does not belong to user', async () => {
    const res = await testApp.handle(
      new Request('http://localhost/tasks/999999/toggle-done', { method: 'PATCH' })
    );
    expect(res.status).toBe(404);
  });
});
