import { Elysia } from 'elysia';
import { z } from 'zod';
import { db } from '../db';
import { courses, userCourses, tasks, assignments, userProfiles } from '../db/schema';

import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, sql, count } from 'drizzle-orm';
import { zodBody } from '../lib/validation';

const CreateCourseSchema = z.object({
  code: z.string().min(1),
  semester: z.string().min(1),
  name: z.string().optional(),
  color: z.string().optional(),
  lectureSchedule: z.string().optional(),
  seminarSchedule: z.string().optional(),
  lectureTeacherId: z.number().optional(),
  seminarTeacherId: z.number().optional(),
});

const UpdateCourseSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().optional(),
  semester: z.string().min(1).optional(),
  color: z.string().optional(),
  lectureSchedule: z.string().optional(),
  seminarSchedule: z.string().optional(),
  lectureTeacherId: z.number().optional(),
  seminarTeacherId: z.number().optional(),
});

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
        enrolled: sql<boolean>`(${userCourses.userId} IS NOT NULL)::boolean`,
      })
      .from(courses)
      .leftJoin(
        userCourses,
        and(eq(userCourses.courseId, courses.id), eq(userCourses.userId, (user as AuthUser).id))
      )
      .where(isNull(courses.deletedAt));
  })
  // MUST be declared before /:id so Elysia doesn't capture these as dynamic segments
  .get('/teaching', async ({ user, set }) => {
    const authUser = user as AuthUser;
    if (!authUser.roles.includes('TEACHER')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'TEACHER role required' };
    }
    const courseList = await db
      .select()
      .from(courses)
      .where(and(eq(courses.lectureTeacherId, authUser.id), isNull(courses.deletedAt)));
    const counts = await Promise.all(
      courseList.map(async (c) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(userCourses)
          .where(eq(userCourses.courseId, c.id));
        return { courseId: c.id, count };
      })
    );
    return courseList.map((c) => ({
      ...c,
      studentCount: counts.find((ct) => ct.courseId === c.id)?.count ?? 0,
    }));
  })
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
        and(eq(userCourses.courseId, courses.id), eq(userCourses.userId, (user as AuthUser).id))
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
    zodBody(CreateCourseSchema)
  )
  .get('/:id', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userCourses)
      .where(eq(userCourses.courseId, course.id));
    const teacher = course.lectureTeacherId
      ? await db
          .select({ name: userProfiles.name, avatar: userProfiles.avatar })
          .from(userProfiles)
          .where(eq(userProfiles.userId, course.lectureTeacherId))
          .then((r) => r[0] ?? null)
      : null;
    const [enrollment] = await db
      .select({ userId: userCourses.userId })
      .from(userCourses)
      .where(and(eq(userCourses.courseId, course.id), eq(userCourses.userId, authUser.id)));
    return {
      ...course,
      enrolledCount: count,
      teacherName: teacher?.name ?? null,
      teacherAvatar: teacher?.avatar ?? null,
      enrolled: !!enrollment,
    };
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
    zodBody(UpdateCourseSchema)
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
    await logAction(db, (user as AuthUser).id, `Enrolled in course ${course.id}`);
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
        and(eq(userCourses.courseId, course.id), eq(userCourses.userId, (user as AuthUser).id))
      )
      .returning();
    if (deleted.length === 0) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Not enrolled in this course' };
    }
    await logAction(db, (user as AuthUser).id, `Unenrolled from course ${course.id}`);
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
  })
  .get('/:id/assignments', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    if (!authUser.roles.includes('TEACHER')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'TEACHER role required' };
    }
    const courseId = Number(params.id);
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    if (course.lectureTeacherId !== authUser.id) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Access denied: you do not teach this course' };
    }
    return db
      .select({
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        dueDate: assignments.dueDate,
        total: count(tasks.id),
        done: sql<number>`count(case when ${tasks.status} = 'DONE' then 1 end)`,
      })
      .from(assignments)
      .leftJoin(tasks, and(eq(tasks.assignmentId, assignments.id), isNull(tasks.deletedAt)))
      .where(and(eq(assignments.courseId, courseId), isNull(assignments.deletedAt)))
      .groupBy(assignments.id);
  })
  .post(
    '/:id/assignments',
    async ({ params, body, user, set }) => {
      if (!(user as AuthUser).roles.includes('TEACHER')) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'TEACHER role required' };
      }
      const [course] = await db
        .select()
        .from(courses)
        .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
      if (!course) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Course not found' };
      }
      const enrolled = await db
        .select({ userId: userCourses.userId })
        .from(userCourses)
        .where(eq(userCourses.courseId, course.id));
      if (enrolled.length === 0) {
        set.status = 400;
        return { error: 'NO_STUDENTS', message: 'No students enrolled in this course' };
      }
      const [assignment] = await db
        .insert(assignments)
        .values({
          courseId: course.id,
          title: body.title,
          description: body.description,
          dueDate: new Date(body.dueDate),
        })
        .returning();
      await db.insert(tasks).values(
        enrolled.map((e) => ({
          userId: e.userId,
          assignmentId: assignment.id,
          courseId: course.id,
          title: body.title,
          description: body.description,
          dueDate: new Date(body.dueDate),
        }))
      );
      await logAction(
        db,
        (user as AuthUser).id,
        `Created assignment ${assignment.id} for course ${course.id}`
      );
      return assignment;
    },
    zodBody(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.string(),
      })
    )
  )
;
