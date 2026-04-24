import { Elysia, t } from 'elysia';
import { db } from '../db';
import { courses, userCourses, tasks } from '../db/schema';
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
  )
  .get('/:id', async ({ params, user, set }) => {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    const enrolledRows = await db
      .select()
      .from(userCourses)
      .where(eq(userCourses.courseId, course.id));
    return { ...course, enrolledCount: enrolledRows.length };
  })
  .patch(
    '/:id',
    async ({ params, body, user, set }) => {
      if (!(user as AuthUser).roles.includes('TEACHER')) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'TEACHER role required' };
      }
      const [existing] = await db
        .select()
        .from(courses)
        .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
      if (!existing) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Course not found' };
      }
      if (existing.lectureTeacherId !== (user as AuthUser).id) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Only the lecture teacher can update this course' };
      }
      const [updated] = await db
        .update(courses)
        .set({
          ...(body.code !== undefined && { code: body.code }),
          ...(body.name !== undefined && { name: body.name }),
          ...(body.semester !== undefined && { semester: body.semester }),
          ...(body.color !== undefined && { color: body.color }),
          ...(body.lectureSchedule !== undefined && { lectureSchedule: body.lectureSchedule }),
          ...(body.seminarSchedule !== undefined && { seminarSchedule: body.seminarSchedule }),
          ...(body.lectureTeacherId !== undefined && { lectureTeacherId: body.lectureTeacherId }),
          ...(body.seminarTeacherId !== undefined && { seminarTeacherId: body.seminarTeacherId }),
        })
        .where(eq(courses.id, existing.id))
        .returning();
      await logAction(db, (user as AuthUser).id, `Updated course ${existing.id}`);
      return updated;
    },
    {
      body: t.Object({
        code: t.Optional(t.String({ minLength: 1 })),
        name: t.Optional(t.String()),
        semester: t.Optional(t.String({ minLength: 1 })),
        color: t.Optional(t.String()),
        lectureSchedule: t.Optional(t.String()),
        seminarSchedule: t.Optional(t.String()),
        lectureTeacherId: t.Optional(t.Number()),
        seminarTeacherId: t.Optional(t.Number()),
      }),
    }
  )
  .delete('/:id', async ({ params, user, set }) => {
    if (!(user as AuthUser).roles.includes('TEACHER')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'TEACHER role required' };
    }
    const [existing] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!existing) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    if (existing.lectureTeacherId !== (user as AuthUser).id) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Only the lecture teacher can delete this course' };
    }
    await db.update(courses).set({ deletedAt: new Date() }).where(eq(courses.id, existing.id));
    await logAction(db, (user as AuthUser).id, `Deleted course ${existing.id}`);
    return { success: true };
  })
  .post('/:id/enroll', async ({ params, user, set }) => {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    await db
      .insert(userCourses)
      .values({ userId: (user as AuthUser).id, courseId: course.id })
      .onConflictDoNothing();
    return { success: true };
  })
  .delete('/:id/enroll', async ({ params, user, set }) => {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    const deleted = await db
      .delete(userCourses)
      .where(
        and(
          eq(userCourses.courseId, course.id),
          eq(userCourses.userId, (user as AuthUser).id)
        )
      )
      .returning();
    if (deleted.length === 0) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Not enrolled in this course' };
    }
    return { success: true };
  })
  .get('/:id/progress', async ({ params, user, set }) => {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    const userTasks = await db
      .select({ status: tasks.status })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, (user as AuthUser).id),
          eq(tasks.courseId, course.id),
          isNull(tasks.deletedAt)
        )
      );
    const total = userTasks.length;
    const done = userTasks.filter((t) => t.status === 'DONE').length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, percent };
  });
