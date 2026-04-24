import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../db';
import {
  users, userRoles, roles, userProfiles, userSettings,
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
