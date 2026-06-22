import { db } from '../db';
import { tasks, notes, events, courses, userCourses } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { eq, and, isNull, ilike, or } from 'drizzle-orm';

export async function search(user: AuthUser, q: string) {
  if (!q.trim()) return { tasks: [], notes: [], events: [], courses: [] };

  const pattern = `%${q}%`;

  const [userTasks, userNotes, userEvents, userCoursesList] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, user.id),
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
          eq(notes.userId, user.id),
          isNull(notes.deletedAt),
          or(ilike(notes.title, pattern), ilike(notes.description, pattern))
        )
      )
      .limit(10),
    db
      .select()
      .from(events)
      .where(
        and(eq(events.userId, user.id), isNull(events.deletedAt), ilike(events.title, pattern))
      )
      .limit(10),
    db
      .select({ id: courses.id, name: courses.name, code: courses.code })
      .from(courses)
      .innerJoin(userCourses, eq(userCourses.courseId, courses.id))
      .where(
        and(
          eq(userCourses.userId, user.id),
          isNull(courses.deletedAt),
          or(ilike(courses.name, pattern), ilike(courses.code, pattern))
        )
      )
      .limit(10),
  ]);

  return { tasks: userTasks, notes: userNotes, events: userEvents, courses: userCoursesList };
}
