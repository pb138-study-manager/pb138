import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { db } from '../db';
import { auditLogs, users } from '../db/schema';
import { logAction } from './audit';
import { eq } from 'drizzle-orm';

let testUserId: number;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: 'audit-test@example.com',
      login: 'audit-test-user',
      pwdHash: 'hash',
    })
    .returning();
  testUserId = user.id;
});

afterAll(async () => {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));
});

describe('logAction', () => {
  it('inserts a row into audit_logs', async () => {
    await logAction(db, testUserId, 'test action');
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.actorId, testUserId));
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].description).toBe('test action');
    expect(logs[0].actorId).toBe(testUserId);
  });
});
