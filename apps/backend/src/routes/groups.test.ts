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

  it('returns 401 without auth', async () => {
    const res = await testApp.handle(new Request('http://localhost/groups'));
    expect(res.status).toBe(401);
  });
});

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

  it('returns 401 without auth', async () => {
    const res = await testApp.handle(
      new Request('http://localhost/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty name', async () => {
    const res = await testApp.handle(
      req('http://localhost/groups', userAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      })
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

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
  beforeAll(async () => {
    // Ensure userId is a member of teacherGroupId for the remove test
    await db.insert(groupMembers).values({ userId, groupId: teacherGroupId }).onConflictDoNothing();
  });

  it('returns 404 when user is not a member', async () => {
    const res = await testApp.handle(
      req(`http://localhost/groups/${userGroupId}/members/${teacherId}`, userAuth, { method: 'DELETE' })
    );
    expect(res.status).toBe(404);
  });

  it('mentor can remove a member', async () => {
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
