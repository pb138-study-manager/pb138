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
