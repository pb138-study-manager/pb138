import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../db';
import { folders, notes, users, auditLogs } from '../db/schema';
import { foldersRoutes } from './folders';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';

const TEST_SECRET = 'folders-test-jwt-secret';
const TEST_AUTH_ID = 'folders-test-supabase-uuid';
process.env.SUPABASE_JWT_SECRET = TEST_SECRET;

async function makeAuthHeader(): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  const token = await new SignJWT({ sub: TEST_AUTH_ID })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
  return `Bearer ${token}`;
}

let testUserId: number;
let testApp: Elysia;
let authHeader: string;

async function req(url: string, init: RequestInit = {}): Promise<Request> {
  return new Request(url, {
    ...init,
    headers: { Authorization: authHeader, ...init.headers },
  });
}

beforeAll(async () => {
  authHeader = await makeAuthHeader();
  const [user] = await db
    .insert(users)
    .values({
      email: 'folders-test@example.com',
      login: 'folders-test-user',
      pwdHash: '',
      authId: TEST_AUTH_ID,
    })
    .returning();
  testUserId = user.id;
  testApp = new Elysia().use(foldersRoutes);
});

afterAll(async () => {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, testUserId));
  await db.delete(notes).where(eq(notes.userId, testUserId));
  await db.delete(folders).where(eq(folders.userId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));
});

describe('GET /folders', () => {
  it('returns empty array when user has no folders', async () => {
    const res = await testApp.handle(await req('http://localhost/folders'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  it('returns folders belonging to the user', async () => {
    await db.insert(folders).values({ userId: testUserId, name: 'Study' });
    const res = await testApp.handle(await req('http://localhost/folders'));
    const body = await res.json();
    expect(body.some((f: { name: string }) => f.name === 'Study')).toBe(true);
  });
});
