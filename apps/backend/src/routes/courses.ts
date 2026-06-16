import { Elysia } from 'elysia';
import { z } from 'zod';
import { db } from '../db';
import {
  courses,
  userCourses,
  tasks,
  assignments,
  assignmentSubtasks,
  userProfiles,
  users,
  evals,
  events,
} from '../db/schema';

import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, isNotNull, sql, count } from 'drizzle-orm';
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
    const authUser = user as AuthUser;
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    if (course.lectureTeacherId === authUser.id || course.seminarTeacherId === authUser.id) {
      set.status = 400;
      return {
        error: 'SELF_ENROLLMENT_FORBIDDEN',
        message: 'Teacher cannot enroll in their own course',
      };
    }
    await db
      .insert(userCourses)
      .values({ userId: authUser.id, courseId: course.id })
      .onConflictDoNothing();
    await logAction(db, authUser.id, `Enrolled in course ${course.id}`);
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
    const courseId = Number(params.id);
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    const isTeacher = authUser.roles.includes('TEACHER') && course.lectureTeacherId === authUser.id;
    if (!isTeacher) {
      // Students: return public deadline info for assignments they have tasks for
      const studentAssignments = await db
        .select({
          id: assignments.id,
          title: assignments.title,
          dueDate: assignments.dueDate,
        })
        .from(assignments)
        .innerJoin(
          tasks,
          and(
            eq(tasks.assignmentId, assignments.id),
            eq(tasks.userId, authUser.id),
            isNull(tasks.deletedAt)
          )
        )
        .where(and(eq(assignments.courseId, courseId), isNull(assignments.deletedAt)));
      return studentAssignments;
    }
    return db
      .select({
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        dueDate: assignments.dueDate,
        evalType: assignments.evalType,
        total: count(tasks.id),
        done: sql<number>`count(case when ${tasks.status} = 'DONE' then 1 end)`,
      })
      .from(assignments)
      .leftJoin(tasks, and(eq(tasks.assignmentId, assignments.id), isNull(tasks.deletedAt)))
      .where(and(eq(assignments.courseId, courseId), isNull(assignments.deletedAt)))
      .groupBy(assignments.id);
  })
  .get('/:id/students', async ({ params, user, set }) => {
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
    const enrolled = await db
      .select({
        id: users.id,
        email: users.email,
        name: userProfiles.name,
        avatar: userProfiles.avatar,
      })
      .from(userCourses)
      .innerJoin(users, and(eq(userCourses.userId, users.id), isNull(users.deletedAt)))
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(userCourses.courseId, courseId));

    return Promise.all(
      enrolled.map(async (student) => {
        const [stats] = await db
          .select({
            total: count(tasks.id),
            done: sql<number>`count(case when ${tasks.status} = 'DONE' then 1 end)`,
          })
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, student.id),
              eq(tasks.courseId, courseId),
              isNotNull(tasks.assignmentId),
              isNull(tasks.deletedAt)
            )
          );
        return { ...student, total: stats.total, done: stats.done };
      })
    );
  })
  .get('/:id/students/:studentId', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    if (!authUser.roles.includes('TEACHER')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'TEACHER role required' };
    }
    const courseId = Number(params.id);
    const studentId = Number(params.studentId);
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
      return { error: 'FORBIDDEN', message: 'Access denied' };
    }
    const studentTasks = await db
      .select({
        taskId: tasks.id,
        status: tasks.status,
        assignmentId: assignments.id,
        assignmentTitle: assignments.title,
        evalType: assignments.evalType,
        dueDate: tasks.dueDate,
        evalScore: evals.score,
        evalFeedback: evals.feedback,
      })
      .from(tasks)
      .innerJoin(assignments, eq(tasks.assignmentId, assignments.id))
      .leftJoin(evals, eq(evals.taskId, tasks.id))
      .where(
        and(
          eq(tasks.userId, studentId),
          eq(tasks.courseId, courseId),
          isNotNull(tasks.assignmentId),
          isNull(tasks.deletedAt)
        )
      );
    return studentTasks;
  })
  .post(
    '/:id/assignments',
    async ({ params, body, user, set }) => {
      const authUser = user as AuthUser;
      if (!authUser.roles.includes('TEACHER')) {
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
      if (course.lectureTeacherId !== authUser.id) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Access denied: you do not teach this course' };
      }
      const allEnrolled = await db
        .select({ userId: userCourses.userId })
        .from(userCourses)
        .where(eq(userCourses.courseId, course.id));
      const recipients = body.targetUserId
        ? allEnrolled.filter((e) => e.userId === body.targetUserId)
        : allEnrolled;
      if (recipients.length === 0) {
        set.status = 400;
        return { error: 'NO_STUDENTS', message: 'No eligible students found' };
      }
      const deadline = new Date(body.dueDate);
      const assignment = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(assignments)
          .values({
            courseId: course.id,
            title: body.title,
            description: body.description,
            dueDate: deadline,
            evalType: body.evalType ?? 'none',
          })
          .returning();
        // Tasks for students have no due date — student sets their own
        await tx.insert(tasks).values(
          recipients.map((e) => ({
            userId: e.userId,
            assignmentId: created.id,
            courseId: course.id,
            title: body.title,
            description: body.description,
          }))
        );
        // Create a DEADLINE calendar event for each student
        await tx.insert(events).values(
          recipients.map((e) => ({
            userId: e.userId,
            title: body.title,
            description: `Deadline for assignment`,
            startDate: deadline,
            endDate: deadline,
            courseId: course.id,
            type: 'DEADLINE' as const,
          }))
        );
        return created;
      });
      await logAction(
        db,
        authUser.id,
        `Created assignment ${assignment.id} for course ${course.id}`
      );
      return assignment;
    },
    zodBody(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.string(),
        evalType: z.enum(['none', 'pass_fail', 'graded']).optional().default('none'),
        targetUserId: z.number().int().positive().optional(),
      })
    )
  )
  .post(
    '/:id/students',
    async ({ params, body, user, set }) => {
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
      if (body.userId === authUser.id) {
        set.status = 400;
        return {
          error: 'SELF_ENROLLMENT_FORBIDDEN',
          message: 'Teacher cannot add themselves to a course',
        };
      }
      const [targetUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, body.userId), isNull(users.deletedAt)));
      if (!targetUser) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'User not found' };
      }
      const [existing] = await db
        .select()
        .from(userCourses)
        .where(and(eq(userCourses.userId, body.userId), eq(userCourses.courseId, courseId)));
      if (existing) {
        set.status = 409;
        return { error: 'ALREADY_ENROLLED', message: 'User is already enrolled' };
      }
      await db.insert(userCourses).values({ userId: body.userId, courseId });
      await logAction(db, authUser.id, `Enrolled user ${body.userId} in course ${courseId}`);
      return { success: true };
    },
    zodBody(z.object({ userId: z.number().int().positive() }))
  )
  .patch(
    '/:id/assignments/:assignmentId',
    async ({ params, body, user, set }) => {
      const authUser = user as AuthUser;
      if (!authUser.roles.includes('TEACHER')) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'TEACHER role required' };
      }
      const courseId = Number(params.id);
      const assignmentId = Number(params.assignmentId);
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
      const [existing] = await db
        .select()
        .from(assignments)
        .where(
          and(
            eq(assignments.id, assignmentId),
            eq(assignments.courseId, courseId),
            isNull(assignments.deletedAt)
          )
        );
      if (!existing) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Assignment not found' };
      }
      const [updated] = await db
        .update(assignments)
        .set({
          ...(body.title && { title: body.title }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.dueDate && { dueDate: new Date(body.dueDate) }),
          ...(body.evalType && { evalType: body.evalType }),
        })
        .where(eq(assignments.id, assignmentId))
        .returning();
      await logAction(db, authUser.id, `Updated assignment ${assignmentId}`);
      return updated;
    },
    zodBody(
      z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        evalType: z.enum(['none', 'pass_fail', 'graded']).optional(),
      })
    )
  )
  .get('/:id/assignments/:assignmentId/subtasks', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    if (!authUser.roles.includes('TEACHER')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'TEACHER role required' };
    }
    const courseId = Number(params.id);
    const assignmentId = Number(params.assignmentId);
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
    if (!course || course.lectureTeacherId !== authUser.id) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Access denied' };
    }
    return db
      .select()
      .from(assignmentSubtasks)
      .where(
        and(eq(assignmentSubtasks.assignmentId, assignmentId), isNull(assignmentSubtasks.deletedAt))
      )
      .orderBy(assignmentSubtasks.sortOrder, assignmentSubtasks.id);
  })
  .post(
    '/:id/assignments/:assignmentId/subtasks',
    async ({ params, body, user, set }) => {
      const authUser = user as AuthUser;
      if (!authUser.roles.includes('TEACHER')) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'TEACHER role required' };
      }
      const courseId = Number(params.id);
      const assignmentId = Number(params.assignmentId);
      const [course] = await db
        .select()
        .from(courses)
        .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
      if (!course || course.lectureTeacherId !== authUser.id) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Access denied' };
      }
      const [subtask] = await db
        .insert(assignmentSubtasks)
        .values({ assignmentId, title: body.title })
        .returning();
      await logAction(db, authUser.id, `Added subtask to assignment ${assignmentId}`);
      return subtask;
    },
    zodBody(z.object({ title: z.string().min(1) }))
  )
  .delete('/:id/assignments/:assignmentId/subtasks/:subtaskId', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    if (!authUser.roles.includes('TEACHER')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'TEACHER role required' };
    }
    const courseId = Number(params.id);
    const assignmentId = Number(params.assignmentId);
    const subtaskId = Number(params.subtaskId);
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
    if (!course || course.lectureTeacherId !== authUser.id) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Access denied' };
    }
    const [existing] = await db
      .select()
      .from(assignmentSubtasks)
      .where(
        and(
          eq(assignmentSubtasks.id, subtaskId),
          eq(assignmentSubtasks.assignmentId, assignmentId),
          isNull(assignmentSubtasks.deletedAt)
        )
      );
    if (!existing) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Subtask not found' };
    }
    await db
      .update(assignmentSubtasks)
      .set({ deletedAt: new Date() })
      .where(eq(assignmentSubtasks.id, subtaskId));
    await logAction(
      db,
      authUser.id,
      `Deleted subtask ${subtaskId} from assignment ${assignmentId}`
    );
    return { success: true };
  })
  .get('/:id/my-evals', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    const courseId = Number(params.id);
    try {
      const rows = await db
        .select({
          assignmentTitle: assignments.title,
          dueDate: assignments.dueDate,
          evalType: assignments.evalType,
          score: evals.score,
          feedback: evals.feedback,
          evaluatedAt: evals.evaluatedAt,
        })
        .from(tasks)
        .innerJoin(
          assignments,
          and(eq(tasks.assignmentId, assignments.id), isNull(assignments.deletedAt))
        )
        .innerJoin(evals, eq(evals.taskId, tasks.id))
        .where(
          and(eq(tasks.userId, authUser.id), eq(tasks.courseId, courseId), isNull(tasks.deletedAt))
        )
        .orderBy(sql`${assignments.dueDate} DESC`);
      return rows;
    } catch (err) {
      console.error('my-evals error:', err);
      set.status = 500;
      return { error: 'INTERNAL', message: String(err) };
    }
  })
  .get('/:id/assignments/:assignmentId/students', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    if (!authUser.roles.includes('TEACHER')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'TEACHER role required' };
    }
    const courseId = Number(params.id);
    const assignmentId = Number(params.assignmentId);
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
    const [assignment] = await db
      .select({ dueDate: assignments.dueDate })
      .from(assignments)
      .where(and(eq(assignments.id, assignmentId), isNull(assignments.deletedAt)));
    if (!assignment) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Assignment not found' };
    }
    const rows = await db
      .select({
        taskId: tasks.id,
        userId: users.id,
        name: userProfiles.name,
        email: users.email,
        avatar: userProfiles.avatar,
        status: tasks.status,
        completedAt: tasks.completedAt,
        evalScore: evals.score,
        evalFeedback: evals.feedback,
      })
      .from(tasks)
      .innerJoin(users, and(eq(tasks.userId, users.id), isNull(users.deletedAt)))
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .leftJoin(evals, eq(evals.taskId, tasks.id))
      .where(
        and(
          eq(tasks.assignmentId, assignmentId),
          eq(tasks.courseId, courseId),
          isNull(tasks.deletedAt)
        )
      );
    return rows.map(({ completedAt, ...row }) => ({
      ...row,
      status:
        row.status === 'DONE' && (completedAt === null || completedAt > assignment.dueDate)
          ? ('TODO' as const)
          : row.status,
    }));
  })
  .get('/:id/evaluations', async ({ params, user, set }) => {
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
      return { error: 'FORBIDDEN', message: 'Access denied' };
    }
    const rows = await db
      .select({
        taskId: tasks.id,
        userId: users.id,
        studentName: userProfiles.name,
        studentEmail: users.email,
        studentAvatar: userProfiles.avatar,
        assignmentId: assignments.id,
        assignmentTitle: assignments.title,
        evalType: assignments.evalType,
        dueDate: assignments.dueDate,
        status: tasks.status,
        evalScore: evals.score,
        evalFeedback: evals.feedback,
      })
      .from(tasks)
      .innerJoin(assignments, eq(tasks.assignmentId, assignments.id))
      .innerJoin(users, and(eq(tasks.userId, users.id), isNull(users.deletedAt)))
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .leftJoin(evals, eq(evals.taskId, tasks.id))
      .where(
        and(eq(tasks.courseId, courseId), isNotNull(tasks.assignmentId), isNull(tasks.deletedAt))
      );
    return rows.filter((r) => r.evalType !== 'none');
  });
