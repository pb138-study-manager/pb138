import { Elysia, t } from 'elysia';
import { db } from '../db';
import { events } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, lt, gt } from 'drizzle-orm';

export const eventsRoutes = new Elysia({ prefix: '/events' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', async ({ user, query }) => {
    const conditions = [eq(events.userId, (user as AuthUser).id), isNull(events.deletedAt)];

    // Filter by date range if provided (overlap check: event.endDate > from AND event.startDate < to)
    if (query.from) {
      conditions.push(gt(events.endDate, new Date(query.from as string)));
    }
    if (query.to) {
      conditions.push(lt(events.startDate, new Date(query.to as string)));
    }

    return db.select().from(events).where(and(...conditions));
  });
