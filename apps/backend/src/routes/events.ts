import { Elysia } from 'elysia';
import { z } from 'zod';
import { db } from '../db';
import { events, tasks, userSettings } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { zodBody } from '../lib/validation';

const CreateEventSchema = z.object({
  title: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string().optional(),
  place: z.string().optional(),
  type: z.enum(['EVENT', 'DEADLINE']).optional(),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'startDate must not be after endDate', path: ['startDate'] }
);

const UpdateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  place: z.string().optional(),
  type: z.enum(['EVENT', 'DEADLINE']).optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'startDate must not be after endDate', path: ['startDate'] }
);
import { eq, and, isNull, lt, gt, gte } from 'drizzle-orm';

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
    if (query.courseId) {
      conditions.push(eq(events.courseId, Number(query.courseId)));
    }
    if (query.type) {
      conditions.push(eq(events.type, query.type as 'EVENT' | 'DEADLINE'));
    }
    if (query.upcoming === 'true') {
      conditions.push(gte(events.startDate, new Date()));
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
          type: body.type ?? 'EVENT',
        })
        .returning();
      await logAction(db, (user as AuthUser).id, `Created event ${event.id}: ${event.title}`);
      return event;
    },
    zodBody(CreateEventSchema)
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
          ...(body.description !== undefined && { description: body.description ?? null }),
          ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
          ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
          ...(body.place !== undefined && { place: body.place }),
          ...(body.type !== undefined && { type: body.type }),
        })
        .where(eq(events.id, existing.id))
        .returning();
      await logAction(db, (user as AuthUser).id, `Updated event ${existing.id}`);
      return updated;
    },
    zodBody(UpdateEventSchema)
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

function fmtIcal(iso: string): string {
  return iso.replace(/[-:.]/g, '').slice(0, 15) + 'Z';
}

function escIcal(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export const eventsIcalRoute = new Elysia().get('/events/ical', async ({ query }) => {
  const token = typeof query.token === 'string' ? query.token : null;
  if (!token) return new Response('Unauthorized', { status: 401 });

  const [settings] = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(eq(userSettings.calendarToken, token));

  if (!settings) return new Response('Unauthorized', { status: 401 });

  const { userId } = settings;

  const userEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.userId, userId), isNull(events.deletedAt)));

  const userTasks = await db
    .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt), isNull(tasks.parentId)));

  const stamp = fmtIcal(new Date().toISOString());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Student OS//StudentOS//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Student OS',
  ];

  for (const ev of userEvents) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:event-${ev.id}@student-os`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${fmtIcal(new Date(ev.startDate).toISOString())}`);
    lines.push(`DTEND:${fmtIcal(new Date(ev.endDate).toISOString())}`);
    lines.push(`SUMMARY:${escIcal(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escIcal(ev.description)}`);
    if (ev.place) lines.push(`LOCATION:${escIcal(ev.place)}`);
    lines.push('END:VEVENT');
  }

  for (const task of userTasks) {
    if (!task.dueDate) continue;
    const dateOnly = new Date(task.dueDate).toISOString().slice(0, 10).replace(/-/g, '');
    const nextDay = new Date(task.dueDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDateOnly = nextDay.toISOString().slice(0, 10).replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:task-${task.id}@student-os`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dateOnly}`);
    lines.push(`DTEND;VALUE=DATE:${nextDateOnly}`);
    lines.push(`SUMMARY:${escIcal(task.title)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="student-os.ics"',
    },
  });
});
