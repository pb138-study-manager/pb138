import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../db';
import {
  courses,
  userCourses,
  users,
  userRoles,
  roles,
  auditLogs,
  tasks,
  assignments,
} from '../db/schema';
import { coursesRoutes } from './courses';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';

const RND = crypto.randomUUID();
const TEST_SECRET = process.env.SUPABASE_JWT_SECRET || 'courses-test-jwt-secret';
const USER_AUTH_ID = `courses-test-user-uuid-${RND}`;
const TEACHER_AUTH_ID = `courses-test-teacher-uuid-${RND}`;
process.env.SUPABASE_JWT_SECRET = TEST_SECRET;

async function makeToken(authId: string): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  return new SignJWT({ sub: authId }).setProtectedHeader({ alg: 'HS256' }).sign(secret);
}

export let userId: number;
export let teacherId: number;
export let userAuth: string;
export let teacherAuth: string;
const testApp = new Elysia().use(coursesRoutes);

function req(url: string, auth: string, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: { Authorization: auth, ...init.headers },
  });
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `courses-user-${RND}@example.com`,
      login: `courses-test-user-${RND}`,
      pwdHash: '',
      authId: USER_AUTH_ID,
    })
    .returning();
  userId = user.id;

  const [teacher] = await db
    .insert(users)
    .values({
      email: `courses-teacher-${RND}@example.com`,
      login: `courses-test-teacher-${RND}`,
      pwdHash: '',
      authId: TEACHER_AUTH_ID,
    })
    .returning();
  teacherId = teacher.id;

  await db.insert(roles).values({ name: 'TEACHER' }).onConflictDoNothing();
  const [teacherRole] = await db.select().from(roles).where(eq(roles.name, 'TEACHER'));
  await db.insert(userRoles).values({ userId: teacherId, roleId: teacherRole.id });

  userAuth = `Bearer ${await makeToken(USER_AUTH_ID)}`;
  teacherAuth = `Bearer ${await makeToken(TEACHER_AUTH_ID)}`;
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
    // Create a new unenrolled user to test clean state
    const cleanRnd = crypto.randomUUID();
    const cleanTestAuthId = `clean-test-${cleanRnd}`;
    const [testUser] = await db
      .insert(users)
      .values({
        email: `courses-clean-${cleanRnd}@example.com`,
        login: `courses-clean-${cleanRnd}`,
        pwdHash: '',
        authId: cleanTestAuthId,
      })
      .returning();
    const testUserAuth = `Bearer ${await makeToken(cleanTestAuthId)}`;

    const res = await testApp.handle(req('http://localhost/courses/enrolled', testUserAuth));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);

    // Cleanup
    await db.delete(users).where(eq(users.id, testUser.id));
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

  it('returns 403 when called by a different TEACHER (not the owner)', async () => {
    const otherRnd = crypto.randomUUID();
    const otherTeacherAuthId = `other-teacher-${otherRnd}`;
    const [otherTeacher] = await db
      .insert(users)
      .values({
        email: `other-teacher-${otherRnd}@example.com`,
        login: `other-teacher-${otherRnd}`,
        pwdHash: '',
        authId: otherTeacherAuthId,
      })
      .returning();
    const [teacherRole] = await db.select().from(roles).where(eq(roles.name, 'TEACHER'));
    await db.insert(userRoles).values({ userId: otherTeacher.id, roleId: teacherRole.id });
    const otherTeacherAuth = `Bearer ${await makeToken(otherTeacherAuthId)}`;

    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}`, otherTeacherAuth, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Stolen' }),
      })
    );
    expect(res.status).toBe(403);

    await db.delete(userRoles).where(eq(userRoles.userId, otherTeacher.id));
    await db.delete(users).where(eq(users.id, otherTeacher.id));
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

  it('returns 403 when called by a different TEACHER (not the owner)', async () => {
    const otherRnd = crypto.randomUUID();
    const otherTeacherAuthId = `other-teacher-del-${otherRnd}`;
    const [otherTeacher] = await db
      .insert(users)
      .values({
        email: `other-teacher-del-${otherRnd}@example.com`,
        login: `other-teacher-del-${otherRnd}`,
        pwdHash: '',
        authId: otherTeacherAuthId,
      })
      .returning();
    const [teacherRole] = await db.select().from(roles).where(eq(roles.name, 'TEACHER'));
    await db.insert(userRoles).values({ userId: otherTeacher.id, roleId: teacherRole.id });
    const otherTeacherAuth = `Bearer ${await makeToken(otherTeacherAuthId)}`;

    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}`, otherTeacherAuth, { method: 'DELETE' })
    );
    expect(res.status).toBe(403);

    await db.delete(userRoles).where(eq(userRoles.userId, otherTeacher.id));
    await db.delete(users).where(eq(users.id, otherTeacher.id));
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
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/progress`, userAuth)
    );
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

  it('returns 200 with empty array for enrolled student with no tasks', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/assignments`, userAuth)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
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

  it('returns 200 with empty array for teacher who does not teach the course', async () => {
    const otherRnd = crypto.randomUUID();
    const OTHER_TEACHER_AUTH_ID = `other-teacher-uuid-asgn-${otherRnd}`;
    const [otherTeacher] = await db
      .insert(users)
      .values({
        email: `other-teacher-asgn-${otherRnd}@example.com`,
        login: `other-teacher-asgn-${otherRnd}`,
        pwdHash: '',
        authId: OTHER_TEACHER_AUTH_ID,
      })
      .returning();
    const [teacherRole] = await db.select().from(roles).where(eq(roles.name, 'TEACHER'));
    await db.insert(userRoles).values({ userId: otherTeacher.id, roleId: teacherRole.id });

    const otherAuth = `Bearer ${await makeToken(OTHER_TEACHER_AUTH_ID)}`;

    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/assignments`, otherAuth)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);

    // Cleanup
    await db.delete(userRoles).where(eq(userRoles.userId, otherTeacher.id));
    await db.delete(users).where(eq(users.id, otherTeacher.id));
  });
});

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

  it('returns 403 if teacher does not teach the course', async () => {
    const otherRnd = crypto.randomUUID();
    const OTHER_AUTH_ID = `other-teacher-uuid-stu-${otherRnd}`;
    const [otherTeacher] = await db
      .insert(users)
      .values({
        email: `other-teacher-stu-${otherRnd}@example.com`,
        login: `other-teacher-stu-${otherRnd}`,
        pwdHash: '',
        authId: OTHER_AUTH_ID,
      })
      .returning();
    const [teacherRole] = await db.select().from(roles).where(eq(roles.name, 'TEACHER'));
    await db.insert(userRoles).values({ userId: otherTeacher.id, roleId: teacherRole.id });
    const token = await makeToken(OTHER_AUTH_ID);

    const res = await testApp.handle(
      req(`http://localhost/courses/${courseId}/students`, `Bearer ${token}`)
    );
    expect(res.status).toBe(403);

    await db.delete(userRoles).where(eq(userRoles.userId, otherTeacher.id));
    await db.delete(users).where(eq(users.id, otherTeacher.id));
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

describe('POST /courses/:id/students (teacher enroll)', () => {
  let enrollCourseId: number;

  beforeAll(async () => {
    const enrollRnd = crypto.randomUUID();
    const [course] = await db
      .insert(courses)
      .values({
        code: `ENROLL-TEST-${enrollRnd.substring(0, 8)}`,
        semester: 'S2026',
        lectureTeacherId: teacherId,
      })
      .returning();
    enrollCourseId = course.id;
  });

  afterAll(async () => {
    await db.delete(userCourses).where(eq(userCourses.courseId, enrollCourseId));
    await db.delete(courses).where(eq(courses.id, enrollCourseId));
  });

  it('returns 403 for non-teacher', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${enrollCourseId}/students`, userAuth, {
        method: 'POST',
        body: JSON.stringify({ userId }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(res.status).toBe(403);
  });

  it('teacher can enroll a student', async () => {
    const res = await testApp.handle(
      req(`http://localhost/courses/${enrollCourseId}/students`, teacherAuth, {
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
      req(`http://localhost/courses/${enrollCourseId}/students`, teacherAuth, {
        method: 'POST',
        body: JSON.stringify({ userId }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(res.status).toBe(409);
  });
});
