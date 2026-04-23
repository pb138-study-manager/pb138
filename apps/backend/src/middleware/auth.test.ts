import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../db';
import { users, userRoles } from '../db/schema';
import { authMiddleware } from './auth';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';

const TEST_SECRET = 'test-supabase-secret';
process.env.SUPABASE_JWT_SECRET = TEST_SECRET;

async function signToken(sub: string): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  return new SignJWT({ sub }).setProtectedHeader({ alg: 'HS256' }).sign(secret);
}

const testAuthId = 'test-supabase-uuid-auth-mw';
let testUserId: number;

// Test app: exposes the resolved user so we can assert on it directly.
// Auth enforcement (401) is tested via tasks.test.ts which uses onBeforeHandle.
const testApp = new Elysia()
  .use(authMiddleware)
  .get('/user-context', ({ user }: any) => ({ userId: user?.id ?? null, authenticated: user !== null }));

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: 'auth-mw-test@example.com',
      login: 'auth-mw-test-user',
      pwdHash: '',
      authId: testAuthId,
    })
    .returning();
  testUserId = user.id;
});

afterAll(async () => {
  await db.delete(userRoles).where(eq(userRoles.userId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));
});

describe('authMiddleware', () => {
  it('sets user to null when Authorization header is missing', async () => {
    const res = await testApp.handle(new Request('http://localhost/user-context'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(false);
  });

  it('sets user to null when token is invalid', async () => {
    const res = await testApp.handle(
      new Request('http://localhost/user-context', {
        headers: { Authorization: 'Bearer invalid.token.here' },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(false);
  });

  it('sets user with correct id when token is valid', async () => {
    const token = await signToken(testAuthId);
    const res = await testApp.handle(
      new Request('http://localhost/user-context', {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.userId).toBe(testUserId);
  });
});
