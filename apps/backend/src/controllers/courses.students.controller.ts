import { db } from '../db';
import { courses, userCourses, tasks, assignments, users, userProfiles, evals } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, isNotNull, count, sql } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../lib/errors';
import { requireCourse } from './courses.controller';

export async function listCourseStudents(user: AuthUser, courseId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id)
    throw new ForbiddenError('Access denied: you do not teach this course');

  const enrolled = await db
    .select({ id: users.id, email: users.email, name: userProfiles.name, avatar: userProfiles.avatar })
    .from(userCourses)
    .innerJoin(users, and(eq(userCourses.userId, users.id), isNull(users.deletedAt)))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(userCourses.courseId, courseId));

  return Promise.all(
    enrolled.map(async (student) => {
      const [stats] = await db
        .select({ total: count(tasks.id), done: sql<number>`count(case when ${tasks.status} = 'DONE' then 1 end)` })
        .from(tasks)
        .where(and(eq(tasks.userId, student.id), eq(tasks.courseId, courseId), isNotNull(tasks.assignmentId), isNull(tasks.deletedAt)));
      return { ...student, total: stats.total, done: stats.done };
    })
  );
}

export async function getStudentDetail(user: AuthUser, courseId: number, studentId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied');

  return db
    .select({
      taskId: tasks.id, status: tasks.status, assignmentId: assignments.id,
      assignmentTitle: assignments.title, evalType: assignments.evalType,
      dueDate: tasks.dueDate, evalScore: evals.score, evalFeedback: evals.feedback,
    })
    .from(tasks)
    .innerJoin(assignments, eq(tasks.assignmentId, assignments.id))
    .leftJoin(evals, eq(evals.taskId, tasks.id))
    .where(and(eq(tasks.userId, studentId), eq(tasks.courseId, courseId), isNotNull(tasks.assignmentId), isNull(tasks.deletedAt)));
}

export async function enrollStudent(user: AuthUser, courseId: number, userId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id)
    throw new ForbiddenError('Access denied: you do not teach this course');
  if (userId === user.id) throw new BadRequestError('Teacher cannot add themselves to a course');

  const [targetUser] = await db.select().from(users).where(and(eq(users.id, userId), isNull(users.deletedAt)));
  if (!targetUser) throw new NotFoundError('User not found');

  const [existing] = await db.select().from(userCourses).where(and(eq(userCourses.userId, userId), eq(userCourses.courseId, courseId)));
  if (existing) throw new ConflictError('User is already enrolled');

  await db.insert(userCourses).values({ userId, courseId });
  await logAction(db, user.id, `Enrolled user ${userId} in course ${courseId}`);
  return { success: true };
}

export async function listAssignmentStudents(user: AuthUser, courseId: number, assignmentId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id)
    throw new ForbiddenError('Access denied: you do not teach this course');

  const [assignment] = await db.select({ dueDate: assignments.dueDate }).from(assignments).where(and(eq(assignments.id, assignmentId), isNull(assignments.deletedAt)));
  if (!assignment) throw new NotFoundError('Assignment not found');

  const rows = await db
    .select({
      taskId: tasks.id, userId: users.id, name: userProfiles.name, email: users.email,
      avatar: userProfiles.avatar, status: tasks.status, completedAt: tasks.completedAt,
      evalScore: evals.score, evalFeedback: evals.feedback,
    })
    .from(tasks)
    .innerJoin(users, and(eq(tasks.userId, users.id), isNull(users.deletedAt)))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .leftJoin(evals, eq(evals.taskId, tasks.id))
    .where(and(eq(tasks.assignmentId, assignmentId), eq(tasks.courseId, courseId), isNull(tasks.deletedAt)));

  return rows.map(({ completedAt, ...row }) => ({
    ...row,
    status: row.status === 'DONE' && (completedAt === null || completedAt > assignment.dueDate) ? ('TODO' as const) : row.status,
  }));
}

export async function getMyEvals(user: AuthUser, courseId: number) {
  return db
    .select({
      assignmentTitle: assignments.title, dueDate: assignments.dueDate, evalType: assignments.evalType,
      score: evals.score, feedback: evals.feedback, evaluatedAt: evals.evaluatedAt,
    })
    .from(tasks)
    .innerJoin(assignments, and(eq(tasks.assignmentId, assignments.id), isNull(assignments.deletedAt)))
    .innerJoin(evals, eq(evals.taskId, tasks.id))
    .where(and(eq(tasks.userId, user.id), eq(tasks.courseId, courseId), isNull(tasks.deletedAt)))
    .orderBy(sql`${assignments.dueDate} DESC`);
}

export async function listCourseEvaluations(user: AuthUser, courseId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied');

  const rows = await db
    .select({
      taskId: tasks.id, userId: users.id, studentName: userProfiles.name, studentEmail: users.email,
      studentAvatar: userProfiles.avatar, assignmentId: assignments.id, assignmentTitle: assignments.title,
      evalType: assignments.evalType, dueDate: assignments.dueDate, status: tasks.status,
      evalScore: evals.score, evalFeedback: evals.feedback,
    })
    .from(tasks)
    .innerJoin(assignments, eq(tasks.assignmentId, assignments.id))
    .innerJoin(users, and(eq(tasks.userId, users.id), isNull(users.deletedAt)))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .leftJoin(evals, eq(evals.taskId, tasks.id))
    .where(and(eq(tasks.courseId, courseId), isNotNull(tasks.assignmentId), isNull(tasks.deletedAt)));

  return rows.filter((r) => r.evalType !== 'none');
}
