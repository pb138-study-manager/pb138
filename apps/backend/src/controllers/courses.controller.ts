import { db } from '../db';
import { courses, userCourses, tasks, userProfiles } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, BadRequestError } from '../lib/errors';
import type { CreateCourseInput, UpdateCourseInput } from '../routes/courses';

export async function requireCourse(courseId: number) {
  const [course] = await db.select().from(courses).where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
  if (!course) throw new NotFoundError('Course not found');
  return course;
}

export async function listCourses(user: AuthUser) {
  return db
    .select({
      id: courses.id, code: courses.code, name: courses.name, semester: courses.semester,
      color: courses.color, lectureSchedule: courses.lectureSchedule, seminarSchedule: courses.seminarSchedule,
      lectureTeacherId: courses.lectureTeacherId, seminarTeacherId: courses.seminarTeacherId,
      deletedAt: courses.deletedAt,
      enrolled: sql<boolean>`(${userCourses.userId} IS NOT NULL)::boolean`,
    })
    .from(courses)
    .leftJoin(userCourses, and(eq(userCourses.courseId, courses.id), eq(userCourses.userId, user.id)))
    .where(isNull(courses.deletedAt));
}

export async function listTeachingCourses(user: AuthUser) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const courseList = await db.select().from(courses).where(and(eq(courses.lectureTeacherId, user.id), isNull(courses.deletedAt)));
  const counts = await Promise.all(
    courseList.map(async (c) => {
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(userCourses).where(eq(userCourses.courseId, c.id));
      return { courseId: c.id, count };
    })
  );
  return courseList.map((c) => ({ ...c, studentCount: counts.find((ct) => ct.courseId === c.id)?.count ?? 0 }));
}

export async function listEnrolledCourses(user: AuthUser) {
  return db
    .select({ id: courses.id, code: courses.code, name: courses.name, semester: courses.semester, color: courses.color, lectureSchedule: courses.lectureSchedule, seminarSchedule: courses.seminarSchedule, lectureTeacherId: courses.lectureTeacherId, seminarTeacherId: courses.seminarTeacherId, deletedAt: courses.deletedAt })
    .from(courses)
    .innerJoin(userCourses, and(eq(userCourses.courseId, courses.id), eq(userCourses.userId, user.id)))
    .where(isNull(courses.deletedAt));
}

export async function createCourse(user: AuthUser, body: CreateCourseInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const [course] = await db
    .insert(courses)
    .values({
      code: body.code, semester: body.semester, name: body.name, color: body.color,
      lectureSchedule: body.lectureSchedule, seminarSchedule: body.seminarSchedule,
      lectureTeacherId: body.lectureTeacherId ?? user.id, seminarTeacherId: body.seminarTeacherId,
    })
    .returning();
  await logAction(db, user.id, `Created course ${course.id}: ${course.code}`);
  return course;
}

export async function getCourse(user: AuthUser, courseId: number) {
  const course = await requireCourse(courseId);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(userCourses).where(eq(userCourses.courseId, course.id));
  const teacher = course.lectureTeacherId
    ? await db.select({ name: userProfiles.name, avatar: userProfiles.avatar }).from(userProfiles).where(eq(userProfiles.userId, course.lectureTeacherId)).then((r) => r[0] ?? null)
    : null;
  const [enrollment] = await db.select({ userId: userCourses.userId }).from(userCourses).where(and(eq(userCourses.courseId, course.id), eq(userCourses.userId, user.id)));
  return { ...course, enrolledCount: count, teacherName: teacher?.name ?? null, teacherAvatar: teacher?.avatar ?? null, enrolled: !!enrollment };
}

export async function updateCourse(user: AuthUser, courseId: number, body: UpdateCourseInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const existing = await requireCourse(courseId);
  if (existing.lectureTeacherId !== user.id) throw new ForbiddenError('Only the lecture teacher can update this course');
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
  await logAction(db, user.id, `Updated course ${existing.id}`);
  return updated;
}

export async function deleteCourse(user: AuthUser, courseId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const existing = await requireCourse(courseId);
  if (existing.lectureTeacherId !== user.id) throw new ForbiddenError('Only the lecture teacher can delete this course');
  await db.update(courses).set({ deletedAt: new Date() }).where(eq(courses.id, existing.id));
  await logAction(db, user.id, `Deleted course ${existing.id}`);
  return { success: true };
}

export async function enrollSelf(user: AuthUser, courseId: number) {
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId === user.id || course.seminarTeacherId === user.id)
    throw new BadRequestError('Teacher cannot enroll in their own course');
  await db.insert(userCourses).values({ userId: user.id, courseId: course.id }).onConflictDoNothing();
  await logAction(db, user.id, `Enrolled in course ${course.id}`);
  return { success: true };
}

export async function unenrollSelf(user: AuthUser, courseId: number) {
  const course = await requireCourse(courseId);
  const deleted = await db.delete(userCourses).where(and(eq(userCourses.courseId, course.id), eq(userCourses.userId, user.id))).returning();
  if (deleted.length === 0) throw new NotFoundError('Not enrolled in this course');
  await logAction(db, user.id, `Unenrolled from course ${course.id}`);
  return { success: true };
}

export async function getCourseProgress(user: AuthUser, courseId: number) {
  const course = await requireCourse(courseId);
  const userTasks = await db.select({ status: tasks.status }).from(tasks).where(and(eq(tasks.userId, user.id), eq(tasks.courseId, course.id), isNull(tasks.deletedAt)));
  const total = userTasks.length;
  const done = userTasks.filter((t) => t.status === 'DONE').length;
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}
