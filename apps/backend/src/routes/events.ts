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
  })
  .post(
    '/',
    async ({ body, user, set }) => {
      // Validate date range: startDate must not be after endDate
      if (new Date(body.startDate) > new Date(body.endDate)) {
        set.status = 400;
        return { error: 'INVALID_DATE_RANGE', message: 'startDate must not be after endDate' };
      }
      const [event] = await db
        .insert(events)
        .values({
          userId: (user as AuthUser).id,
          title: body.title,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          description: body.description,
          place: body.place,
        })
        .returning();
      await logAction(db, (user as AuthUser).id, `Created event ${event.id}: ${event.title}`);
      return event;
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        startDate: t.String(),
        endDate: t.String(),
        description: t.Optional(t.String()),
        place: t.Optional(t.String()),
      }),
    }
  )
  .get('/:id', async ({ params, user, set }) => {
    const [event] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.id, Number(params.id)),
          eq(events.userId, (user as AuthUser).id),
          isNull(events.deletedAt)
        )
      );
    if (!event) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Event not found or access denied' };
    }
    return event;
  })
  .patch(
    '/:id',
    async ({ params, body, user, set }) => {
      if (body.startDate && body.endDate && new Date(body.startDate) > new Date(body.endDate)) {
        set.status = 400;
        return { error: 'INVALID_DATE_RANGE', message: 'startDate must not be after endDate' };
      }
      const [existing] = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.id, Number(params.id)),
            eq(events.userId, (user as AuthUser).id),
            isNull(events.deletedAt)
          )
        );
      if (!existing) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Event not found or access denied' };
      }
      const [updated] = await db
        .update(events)
        .set({
          ...(body.title !== undefined && { title: body.title }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
          ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
          ...(body.place !== undefined && { place: body.place }),
        })
        .where(eq(events.id, existing.id))
        .returning();
      await logAction(db, (user as AuthUser).id, `Updated event ${existing.id}`);
      return updated;
    },
    {
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        place: t.Optional(t.String()),
      }),
    }
  )
  .delete('/:id', async ({ params, user, set }) => {
    const [existing] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.id, Number(params.id)),
          eq(events.userId, (user as AuthUser).id),
          isNull(events.deletedAt)
        )
      );
    if (!existing) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Event not found or access denied' };
    }
    await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, existing.id));
    await logAction(db, (user as AuthUser).id, `Deleted event ${existing.id}`);
    return { success: true };
  });
