import { Elysia } from 'elysia';
import { db } from '../db';
import { tasks, notes, events, courses, userCourses } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { eq, and, isNull, ilike, or } from 'drizzle-orm';

export const searchRoutes = new Elysia({ prefix: '/search' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', async ({ user, query }) => {
    const authUser = user as AuthUser;
    const q = String(query.q ?? '');
    if (!q.trim()) return { tasks: [], notes: [], events: [], courses: [] };

    const pattern = `%${q}%`;

    const [userTasks, userNotes, userEvents, userCoursesList] = await Promise.all([
      db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, authUser.id),
            isNull(tasks.deletedAt),
            or(ilike(tasks.title, pattern), ilike(tasks.description, pattern))
          )
        )
        .limit(10),
      db
        .select()
        .from(notes)
        .where(
          and(
            eq(notes.userId, authUser.id),
            isNull(notes.deletedAt),
            or(ilike(notes.title, pattern), ilike(notes.description, pattern))
          )
        )
        .limit(10),
      db
        .select()
        .from(events)
        .where(
          and(
            eq(events.userId, authUser.id),
            isNull(events.deletedAt),
            ilike(events.title, pattern)
          )
        )
        .limit(10),
      db
        .select({ id: courses.id, name: courses.name, code: courses.code })
        .from(courses)
        .innerJoin(userCourses, eq(userCourses.courseId, courses.id))
        .where(
          and(
            eq(userCourses.userId, authUser.id),
            isNull(courses.deletedAt),
            or(ilike(courses.name, pattern), ilike(courses.code, pattern))
          )
        )
        .limit(10),
    ]);

    return { tasks: userTasks, notes: userNotes, events: userEvents, courses: userCoursesList };
  });
