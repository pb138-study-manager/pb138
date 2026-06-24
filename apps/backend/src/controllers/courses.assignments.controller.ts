import { db } from '../db';
import { courses, userCourses, tasks, assignments, assignmentSubtasks, events } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, count, sql } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, BadRequestError } from '../lib/errors';
import { requireCourse } from './courses.controller';
import type { CreateAssignmentInput, UpdateAssignmentInput } from '../routes/courses';

export async function listCourseAssignments(user: AuthUser, courseId: number) {
  const course = await requireCourse(courseId);
  const isTeacher = user.roles.includes('TEACHER') && course.lectureTeacherId === user.id;

  if (!isTeacher) {
    return db
      .select({ id: assignments.id, title: assignments.title, dueDate: assignments.dueDate })
      .from(assignments)
      .innerJoin(tasks, and(eq(tasks.assignmentId, assignments.id), eq(tasks.userId, user.id), isNull(tasks.deletedAt)))
      .where(and(eq(assignments.courseId, courseId), isNull(assignments.deletedAt)));
  }

  return db
    .select({
      id: assignments.id, title: assignments.title, description: assignments.description,
      dueDate: assignments.dueDate, evalType: assignments.evalType,
      total: count(tasks.id), done: sql<number>`count(case when ${tasks.status} = 'DONE' then 1 end)`,
    })
    .from(assignments)
    .leftJoin(tasks, and(eq(tasks.assignmentId, assignments.id), isNull(tasks.deletedAt)))
    .where(and(eq(assignments.courseId, courseId), isNull(assignments.deletedAt)))
    .groupBy(assignments.id);
}

export async function createCourseAssignment(user: AuthUser, courseId: number, body: CreateAssignmentInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id)
    throw new ForbiddenError('Access denied: you do not teach this course');

  const allEnrolled = await db.select({ userId: userCourses.userId }).from(userCourses).where(eq(userCourses.courseId, course.id));
  const recipients = body.targetUserId ? allEnrolled.filter((e) => e.userId === body.targetUserId) : allEnrolled;
  if (recipients.length === 0) throw new BadRequestError('No eligible students found');

  const deadline = new Date(body.dueDate);
  const assignment = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(assignments)
      .values({ courseId: course.id, title: body.title, description: body.description, dueDate: deadline, evalType: body.evalType ?? 'none' })
      .returning();
    await tx.insert(tasks).values(
      recipients.map((e) => ({ userId: e.userId, assignmentId: created.id, courseId: course.id, title: body.title, description: body.description }))
    );
    await tx.insert(events).values(
      recipients.map((e) => ({ userId: e.userId, title: body.title, description: 'Deadline for assignment', startDate: deadline, endDate: deadline, courseId: course.id, type: 'DEADLINE' as const }))
    );
    return created;
  });
  await logAction(db, user.id, `Created assignment ${assignment.id} for course ${courseId}`);
  return assignment;
}

export async function updateCourseAssignment(user: AuthUser, courseId: number, assignmentId: number, body: UpdateAssignmentInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id)
    throw new ForbiddenError('Access denied: you do not teach this course');

  const [existing] = await db.select().from(assignments).where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId), isNull(assignments.deletedAt)));
  if (!existing) throw new NotFoundError('Assignment not found');

  const [updated] = await db
    .update(assignments)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
      ...(body.evalType !== undefined && { evalType: body.evalType }),
    })
    .where(eq(assignments.id, assignmentId))
    .returning();
  await logAction(db, user.id, `Updated assignment ${assignmentId}`);
  return updated;
}

export async function listAssignmentSubtasks(user: AuthUser, courseId: number, assignmentId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied');
  return db
    .select()
    .from(assignmentSubtasks)
    .where(and(eq(assignmentSubtasks.assignmentId, assignmentId), isNull(assignmentSubtasks.deletedAt)))
    .orderBy(assignmentSubtasks.sortOrder, assignmentSubtasks.id);
}

export async function createAssignmentSubtask(user: AuthUser, courseId: number, assignmentId: number, title: string) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied');
  const [subtask] = await db.insert(assignmentSubtasks).values({ assignmentId, title }).returning();
  await logAction(db, user.id, `Added subtask to assignment ${assignmentId}`);
  return subtask;
}

export async function deleteAssignmentSubtask(user: AuthUser, courseId: number, assignmentId: number, subtaskId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied');
  const [existing] = await db.select().from(assignmentSubtasks).where(and(eq(assignmentSubtasks.id, subtaskId), eq(assignmentSubtasks.assignmentId, assignmentId), isNull(assignmentSubtasks.deletedAt)));
  if (!existing) throw new NotFoundError('Subtask not found');
  await db.update(assignmentSubtasks).set({ deletedAt: new Date() }).where(eq(assignmentSubtasks.id, subtaskId));
  await logAction(db, user.id, `Deleted subtask ${subtaskId} from assignment ${assignmentId}`);
  return { success: true };
}
