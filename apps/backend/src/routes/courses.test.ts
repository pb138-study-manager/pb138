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
