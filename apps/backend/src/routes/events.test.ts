import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../db';
import { events, users, auditLogs } from '../db/schema';
import { eventsRoutes } from './events';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';

const TEST_SECRET = 'events-test-jwt-secret';
const TEST_AUTH_ID = 'events-test-supabase-uuid';
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
      email: 'events-test@example.com',
      login: 'events-test-user',
      pwdHash: '',
      authId: TEST_AUTH_ID,
    })
    .returning();
  testUserId = user.id;

  testApp = new Elysia().use(eventsRoutes);
});

afterAll(async () => {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, testUserId));
  await db.delete(events).where(eq(events.userId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));
});

describe('GET /events', () => {
  it('returns empty array when user has no events', async () => {
    const res = await testApp.handle(await req('http://localhost/events'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  it('returns events belonging to the user', async () => {
    await db.insert(events).values({
      userId: testUserId,
      title: 'Team meeting',
      startDate: new Date('2026-05-01T10:00:00Z'),
      endDate: new Date('2026-05-01T11:00:00Z'),
    });
    const res = await testApp.handle(await req('http://localhost/events'));
    const body = await res.json();
    expect(body.some((e: { title: string }) => e.title === 'Team meeting')).toBe(true);
  });

  it('returns event overlapping the query window', async () => {
    await db.insert(events).values({
      userId: testUserId,
      title: 'Multi-day event',
      startDate: new Date('2026-05-10T00:00:00Z'),
      endDate: new Date('2026-05-12T00:00:00Z'),
    });
    const res = await testApp.handle(
      await req('http://localhost/events?from=2026-05-11T00:00:00Z&to=2026-05-20T00:00:00Z')
    );
    const body = await res.json();
    expect(body.some((e: { title: string }) => e.title === 'Multi-day event')).toBe(true);
  });

  it('excludes events outside the query window', async () => {
    await db.insert(events).values({
      userId: testUserId,
      title: 'Future event',
      startDate: new Date('2026-07-01T00:00:00Z'),
      endDate: new Date('2026-07-02T00:00:00Z'),
    });
    const res = await testApp.handle(
      await req('http://localhost/events?from=2026-05-01T00:00:00Z&to=2026-05-31T00:00:00Z')
    );
    const body = await res.json();
    expect(body.some((e: { title: string }) => e.title === 'Future event')).toBe(false);
  });
});
