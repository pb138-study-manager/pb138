import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../db';
import {
  users, userRoles, userProfiles, userSettings,
  userCourses, courses, userIntegrations, auditLogs,
} from '../db/schema';
import { usersRoutes } from './users';
import { eq, and } from 'drizzle-orm';
import { SignJWT } from 'jose';

const TEST_SECRET = 'users-test-jwt-secret';
const USER_AUTH_ID = 'users-test-user-uuid';
process.env.SUPABASE_JWT_SECRET = TEST_SECRET;

async function makeToken(authId: string): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  return new SignJWT({ sub: authId })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
}

let userId: number;
let userAuth: string;
let testApp: Elysia;

function req(url: string, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: { Authorization: userAuth, ...init.headers },
  });
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: 'users-test@example.com',
      login: 'users-test-user',
      pwdHash: '',
      authId: USER_AUTH_ID,
    })
    .returning();
  userId = user.id;
  userAuth = `Bearer ${await makeToken(USER_AUTH_ID)}`;
  testApp = new Elysia().use(usersRoutes);
});

afterAll(async () => {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, userId));
  await db.delete(userIntegrations).where(eq(userIntegrations.userId, userId));
  await db.delete(userCourses).where(eq(userCourses.userId, userId));
  await db.delete(userSettings).where(eq(userSettings.userId, userId));
  await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
  await db.delete(userRoles).where(eq(userRoles.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
});

describe('GET /users/me', () => {
  it('returns correct shape for a new user with no profile/settings/courses', async () => {
    const res = await testApp.handle(req('http://localhost/users/me'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(userId);
    expect(body.email).toBe('users-test@example.com');
    expect(body.login).toBe('users-test-user');
    expect(Array.isArray(body.roles)).toBe(true);
    expect(body.profile.name).toBeNull();
    expect(body.settings.notificationsEnabled).toBe(true);
    expect(body.settings.lightTheme).toBe(true);
    expect(Array.isArray(body.enrolledCourses)).toBe(true);
    expect(body.enrolledCourses.length).toBe(0);
    expect(Array.isArray(body.integrations)).toBe(true);
  });

  it('returns 401 without authorization header', async () => {
    const res = await testApp.handle(new Request('http://localhost/users/me'));
    expect(res.status).toBe(401);
  });

  it('returns enrolled courses with lecture and seminar teachers', async () => {
    const [teacher] = await db
      .insert(users)
      .values({ email: 'teacher-me@example.com', login: 'teacher-me', pwdHash: '', authId: 'teacher-me-uuid' })
      .returning();
    const [course] = await db
      .insert(courses)
      .values({ code: 'ME-TEST', semester: 'Spring 2026', lectureTeacherId: teacher.id, seminarTeacherId: teacher.id })
      .returning();
    await db.insert(userCourses).values({ userId, courseId: course.id });

    const res = await testApp.handle(req('http://localhost/users/me'));
    const body = await res.json();
    const enrolled = body.enrolledCourses.find((c: { courseId: number }) => c.courseId === course.id);
    expect(enrolled).toBeDefined();
    expect(enrolled.code).toBe('ME-TEST');
    expect(enrolled.lectureTeacher).not.toBeNull();
    expect(enrolled.lectureTeacher.id).toBe(teacher.id);
    expect(enrolled.seminarTeacher).not.toBeNull();

    // cleanup
    await db.delete(userCourses).where(and(eq(userCourses.userId, userId), eq(userCourses.courseId, course.id)));
    await db.delete(courses).where(eq(courses.id, course.id));
    await db.delete(users).where(eq(users.id, teacher.id));
  });
});

describe('PATCH /users/me/profile', () => {
  it('creates profile on first call (upsert)', async () => {
    const res = await testApp.handle(
      req('http://localhost/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test User', organization: 'MU Brno' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Test User');
    expect(body.organization).toBe('MU Brno');
  });

  it('updates profile on second call', async () => {
    const res = await testApp.handle(
      req('http://localhost/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Updated Name');
  });
});

describe('GET /users/me/settings', () => {
  it('returns defaults when no settings row exists', async () => {
    const freshAuthId = `fresh-settings-${Date.now()}`;
    const [freshUser] = await db
      .insert(users)
      .values({ email: `fresh-${Date.now()}@example.com`, login: `fresh-${Date.now()}`, pwdHash: '', authId: freshAuthId })
      .returning();
    const freshAuth = `Bearer ${await makeToken(freshAuthId)}`;
    const freshApp = new Elysia().use(usersRoutes);

    const res = await freshApp.handle(
      new Request('http://localhost/users/me/settings', { headers: { Authorization: freshAuth } })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notificationsEnabled).toBe(true);
    expect(body.lightTheme).toBe(true);

    await db.delete(users).where(eq(users.id, freshUser.id));
  });
});

describe('PATCH /users/me/settings', () => {
  it('upserts settings and returns updated values', async () => {
    const res = await testApp.handle(
      req('http://localhost/users/me/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lightTheme: false, notificationsEnabled: false }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lightTheme).toBe(false);
    expect(body.notificationsEnabled).toBe(false);
  });
});

describe('GET /users/search', () => {
  it('returns matching user by login', async () => {
    const res = await testApp.handle(req('http://localhost/users/search?q=users-test'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((u: { id: number }) => u.id === userId)).toBe(true);
  });

  it('returns empty array when no match', async () => {
    const res = await testApp.handle(req('http://localhost/users/search?q=zzz-no-match-xyz'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(0);
  });

  it('returns 400 when query is under 2 chars', async () => {
    const res = await testApp.handle(req('http://localhost/users/search?q=x'));
    expect(res.status).toBe(400);
  });
});

describe('POST /users/me/integrations/:service', () => {
  it('marks service as connected and appears in GET /users/me', async () => {
    const res = await testApp.handle(
      req('http://localhost/users/me/integrations/google_calendar', { method: 'POST' })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    const meRes = await testApp.handle(req('http://localhost/users/me'));
    const me = await meRes.json();
    expect(me.integrations.some((i: { service: string }) => i.service === 'google_calendar')).toBe(true);
  });
});

describe('DELETE /users/me/integrations/:service', () => {
  it('marks service as disconnected', async () => {
    const res = await testApp.handle(
      req('http://localhost/users/me/integrations/google_calendar', { method: 'DELETE' })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('returns 404 when service was never connected', async () => {
    const res = await testApp.handle(
      req('http://localhost/users/me/integrations/nonexistent_service', { method: 'DELETE' })
    );
    expect(res.status).toBe(404);
  });
});
