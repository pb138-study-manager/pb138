import { Elysia, t } from 'elysia';
import { db } from '../db';
import { courses, userCourses } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
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
  })
  // MUST be declared before /:id so Elysia doesn't capture "enrolled" as a dynamic segment
  .get('/enrolled', async ({ user }) => {
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
      })
      .from(courses)
      .innerJoin(
        userCourses,
        and(
          eq(userCourses.courseId, courses.id),
          eq(userCourses.userId, (user as AuthUser).id)
        )
      )
      .where(isNull(courses.deletedAt));
  })
  .post(
    '/',
    async ({ body, user, set }) => {
      if (!(user as AuthUser).roles.includes('TEACHER')) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'TEACHER role required' };
      }
      const [course] = await db
        .insert(courses)
        .values({
          code: body.code,
          semester: body.semester,
          name: body.name,
          color: body.color,
          lectureSchedule: body.lectureSchedule,
          seminarSchedule: body.seminarSchedule,
          lectureTeacherId: body.lectureTeacherId ?? (user as AuthUser).id,
          seminarTeacherId: body.seminarTeacherId,
        })
        .returning();
      await logAction(db, (user as AuthUser).id, `Created course ${course.id}: ${course.code}`);
      return course;
    },
    {
      body: t.Object({
        code: t.String({ minLength: 1 }),
        semester: t.String({ minLength: 1 }),
        name: t.Optional(t.String()),
        color: t.Optional(t.String()),
        lectureSchedule: t.Optional(t.String()),
        seminarSchedule: t.Optional(t.String()),
        lectureTeacherId: t.Optional(t.Number()),
        seminarTeacherId: t.Optional(t.Number()),
      }),
    }
  );
