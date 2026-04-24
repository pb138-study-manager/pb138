import { Elysia } from 'elysia';
import { db } from '../db';
import {
  users, userProfiles, userSettings,
  userCourses, courses, userIntegrations,
} from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { eq, and, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export const usersRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/me', async ({ user, set }) => {
    const uid = (user as AuthUser).id;

    // Fetch base user fields — filter soft-deleted users
    const [baseUser] = await db
      .select({ id: users.id, email: users.email, login: users.login })
      .from(users)
      .where(and(eq(users.id, uid), isNull(users.deletedAt)));

    if (!baseUser) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'User not found' };
    }

    // Optional profile row (may not exist yet)
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, uid));

    // Optional settings row — fall back to defaults if missing
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, uid));

    // Enrolled courses with teacher info via aliased joins
    const lectureTeachers = alias(users, 'lecture_teachers');
    const seminarTeachers = alias(users, 'seminar_teachers');
    const lectureTeacherProfiles = alias(userProfiles, 'lecture_teacher_profiles');
    const seminarTeacherProfiles = alias(userProfiles, 'seminar_teacher_profiles');

    const courseRows = await db
      .select({
        courseId: courses.id,
        code: courses.code,
        name: courses.name,
        lectureTeacherId: courses.lectureTeacherId,
        lectureTeacherEmail: lectureTeachers.email,
        lectureTeacherName: lectureTeacherProfiles.name,
        seminarTeacherId: courses.seminarTeacherId,
        seminarTeacherEmail: seminarTeachers.email,
        seminarTeacherName: seminarTeacherProfiles.name,
      })
      .from(userCourses)
      .innerJoin(courses, and(eq(userCourses.courseId, courses.id), isNull(courses.deletedAt)))
      .leftJoin(lectureTeachers, eq(courses.lectureTeacherId, lectureTeachers.id))
      .leftJoin(lectureTeacherProfiles, eq(courses.lectureTeacherId, lectureTeacherProfiles.userId))
      .leftJoin(seminarTeachers, eq(courses.seminarTeacherId, seminarTeachers.id))
      .leftJoin(seminarTeacherProfiles, eq(courses.seminarTeacherId, seminarTeacherProfiles.userId))
      .where(eq(userCourses.userId, uid));

    // Active integrations only
    const integrationRows = await db
      .select({ service: userIntegrations.service, connectedAt: userIntegrations.connectedAt })
      .from(userIntegrations)
      .where(and(eq(userIntegrations.userId, uid), eq(userIntegrations.connected, true)));

    return {
      id: baseUser.id,
      email: baseUser.email,
      login: baseUser.login,
      roles: (user as AuthUser).roles,
      profile: {
        name: profile?.name ?? null,
        title: profile?.title ?? null,
        organization: profile?.organization ?? null,
        bio: profile?.bio ?? null,
      },
      settings: {
        notificationsEnabled: settings?.notificationsEnabled ?? true,
        lightTheme: settings?.lightTheme ?? true,
      },
      enrolledCourses: courseRows.map((row) => ({
        courseId: row.courseId,
        code: row.code,
        name: row.name,
        lectureTeacher: row.lectureTeacherId
          ? {
              id: row.lectureTeacherId,
              name: row.lectureTeacherName ?? null,
              email: row.lectureTeacherEmail ?? '',
            }
          : null,
        seminarTeacher: row.seminarTeacherId
          ? {
              id: row.seminarTeacherId,
              name: row.seminarTeacherName ?? null,
              email: row.seminarTeacherEmail ?? '',
            }
          : null,
      })),
      integrations: integrationRows.map((r) => ({
        service: r.service,
        connectedAt: r.connectedAt?.toISOString() ?? new Date().toISOString(),
      })),
    };
  });

