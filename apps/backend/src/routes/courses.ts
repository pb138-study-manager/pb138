import { Elysia } from 'elysia';
import { db } from '../db';
import { courses, userCourses } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { eq, and, isNull, sql } from 'drizzle-orm';

export const coursesRoutes = new Elysia({ prefix: '/courses' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', async ({ user }) => {
    // LEFT JOIN userCourses scoped to the current user — if a row matches,
    // the user is enrolled; we surface that as a boolean `enrolled` field.
    return db
      .select({
        id: courses.id,
        code: courses.code,
        name: courses.name,
        semester: courses.semester,
        color: courses.color,
        lectureSchedule: courses.lectureSchedule,
        seminarSchedule: courses.seminarSchedule,
        lectureTeacherId: courses.lectureTeacherId,
        seminarTeacherId: courses.seminarTeacherId,
        deletedAt: courses.deletedAt,
        // Cast to boolean: IS NOT NULL means there's a matching enrollment row
        enrolled: sql<boolean>`${userCourses.userId} IS NOT NULL`,
      })
      .from(courses)
      .leftJoin(
        userCourses,
        and(
          eq(userCourses.courseId, courses.id),
          eq(userCourses.userId, (user as AuthUser).id)
        )
      )
      .where(isNull(courses.deletedAt));
  });
