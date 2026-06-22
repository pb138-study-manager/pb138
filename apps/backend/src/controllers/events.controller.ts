import { db } from '../db';
import { events, tasks, userSettings } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, lt, gt, gte } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../lib/errors';
import type { CreateEventInput, UpdateEventInput } from '../routes/events';

export interface ListEventsQuery {
  from?: string;
  to?: string;
  courseId?: string;
  type?: string;
  upcoming?: string;
}

export async function listEvents(user: AuthUser, query: ListEventsQuery) {
  const conditions = [eq(events.userId, user.id), isNull(events.deletedAt)];
  if (query.from) conditions.push(gt(events.endDate, new Date(query.from)));
  if (query.to) conditions.push(lt(events.startDate, new Date(query.to)));
  if (query.courseId) conditions.push(eq(events.courseId, Number(query.courseId)));
  if (query.type) conditions.push(eq(events.type, query.type as 'EVENT' | 'DEADLINE'));
  if (query.upcoming === 'true') conditions.push(gte(events.startDate, new Date()));

  return db
    .select()
    .from(events)
    .where(and(...conditions));
}

export async function createEvent(user: AuthUser, body: CreateEventInput) {
  if (new Date(body.startDate) > new Date(body.endDate)) {
    throw new BadRequestError('startDate must not be after endDate');
  }
  const [event] = await db
    .insert(events)
    .values({
      userId: user.id,
      title: body.title,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      description: body.description,
      place: body.place,
      type: body.type ?? 'EVENT',
    })
    .returning();
  await logAction(db, user.id, `Created event ${event.id}: ${event.title}`);
  return event;
}

export async function getEvent(user: AuthUser, id: number) {
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, user.id), isNull(events.deletedAt)));
  if (!event) throw new NotFoundError('Event not found or access denied');
  return event;
}

export async function updateEvent(user: AuthUser, id: number, body: UpdateEventInput) {
  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, user.id), isNull(events.deletedAt)));
  if (!existing) throw new NotFoundError('Event not found or access denied');

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
  await logAction(db, user.id, `Updated event ${existing.id}`);
  return updated;
}

export async function deleteEvent(user: AuthUser, id: number) {
  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, user.id), isNull(events.deletedAt)));
  if (!existing) throw new NotFoundError('Event not found or access denied');

  await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, existing.id));
  await logAction(db, user.id, `Deleted event ${existing.id}`);
  return { success: true };
}

function fmtIcal(iso: string): string {
  return iso.replace(/[-:.]/g, '').slice(0, 15) + 'Z';
}

function escIcal(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function getIcal(token: string | null): Promise<Response> {
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
}
