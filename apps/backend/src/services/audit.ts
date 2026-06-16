import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { auditLogs } from '../db/schema';

export async function logAction(
  db: PostgresJsDatabase,
  actorId: number,
  description: string
): Promise<void> {
  await db.insert(auditLogs).values({ actorId, description });
}
