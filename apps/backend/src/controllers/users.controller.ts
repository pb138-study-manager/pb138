import { db } from '../db';
import { users, userProfiles, userSettings, userCourses, courses, userIntegrations } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, ilike, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { NotFoundError, BadRequestError, ConflictError, InternalError } from '../lib/errors';
import { uploadFile, getPublicUrl, AVATARS_BUCKET } from '../services/storage';
import type { UpdateProfileInput, UpdateSettingsInput, ChangePasswordInput } from '../routes/users';

export async function getMe(user: AuthUser) {
  const [baseUser] = await db
    .select({ id: users.id, email: users.email, login: users.login })
    .from(users)
    .where(and(eq(users.id, user.id), isNull(users.deletedAt)));
  if (!baseUser) throw new NotFoundError('User not found');

  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id));
  const [settings] = await db
    .select({ notificationsEnabled: userSettings.notificationsEnabled, lightTheme: userSettings.lightTheme })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .catch(() => [null]);

  const lectureTeachers = alias(users, 'lecture_teachers');
  const seminarTeachers = alias(users, 'seminar_teachers');
  const lectureTeacherProfiles = alias(userProfiles, 'lecture_teacher_profiles');
  const seminarTeacherProfiles = alias(userProfiles, 'seminar_teacher_profiles');

  const courseRows = await db
    .select({
      courseId: courses.id, code: courses.code, name: courses.name,
      lectureTeacherId: courses.lectureTeacherId, lectureTeacherEmail: lectureTeachers.email,
      lectureTeacherName: lectureTeacherProfiles.name, seminarTeacherId: courses.seminarTeacherId,
      seminarTeacherEmail: seminarTeachers.email, seminarTeacherName: seminarTeacherProfiles.name,
    })
    .from(userCourses)
    .innerJoin(courses, and(eq(userCourses.courseId, courses.id), isNull(courses.deletedAt)))
    .leftJoin(lectureTeachers, eq(courses.lectureTeacherId, lectureTeachers.id))
    .leftJoin(lectureTeacherProfiles, eq(courses.lectureTeacherId, lectureTeacherProfiles.userId))
    .leftJoin(seminarTeachers, eq(courses.seminarTeacherId, seminarTeachers.id))
    .leftJoin(seminarTeacherProfiles, eq(courses.seminarTeacherId, seminarTeacherProfiles.userId))
    .where(eq(userCourses.userId, user.id))
    .catch(() => []);

  const integrationRows = await db
    .select({ service: userIntegrations.service, connectedAt: userIntegrations.connectedAt })
    .from(userIntegrations)
    .where(and(eq(userIntegrations.userId, user.id), eq(userIntegrations.connected, true)))
    .catch(() => []);

  return {
    id: baseUser.id, email: baseUser.email, login: baseUser.login, roles: user.roles,
    profile: {
      name: profile?.name ?? null, title: profile?.title ?? null,
      organization: profile?.organization ?? null, bio: profile?.bio ?? null, avatar: profile?.avatar ?? null,
    },
    settings: { notificationsEnabled: settings?.notificationsEnabled ?? true, lightTheme: settings?.lightTheme ?? true },
    enrolledCourses: courseRows.map((row) => ({
      courseId: row.courseId, code: row.code, name: row.name,
      lectureTeacher: row.lectureTeacherId ? { id: row.lectureTeacherId, name: row.lectureTeacherName ?? null, email: row.lectureTeacherEmail ?? '' } : null,
      seminarTeacher: row.seminarTeacherId ? { id: row.seminarTeacherId, name: row.seminarTeacherName ?? null, email: row.seminarTeacherEmail ?? '' } : null,
    })),
    integrations: integrationRows.map((r) => ({
      service: r.service,
      connectedAt: r.connectedAt instanceof Date ? r.connectedAt.toISOString() : typeof r.connectedAt === 'string' ? r.connectedAt : new Date().toISOString(),
    })),
  };
}

export async function updateProfile(user: AuthUser, body: UpdateProfileInput) {
  if (body.login !== undefined) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.login, body.login), isNull(users.deletedAt)));
    if (existing && existing.id !== user.id) throw new ConflictError('Login is already taken');
    await db.update(users).set({ login: body.login }).where(eq(users.id, user.id));
  }
  const values = {
    userId: user.id,
    ...(body.name !== undefined && { name: body.name }),
    ...(body.title !== undefined && { title: body.title }),
    ...(body.organization !== undefined && { organization: body.organization }),
    ...(body.bio !== undefined && { bio: body.bio }),
  };
  const [updated] = await db
    .insert(userProfiles)
    .values(values)
    .onConflictDoUpdate({ target: userProfiles.userId, set: values })
    .returning();
  await logAction(db, user.id, 'Updated profile');
  return updated;
}

export async function uploadAvatar(user: AuthUser, request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) throw new BadRequestError('file is required');
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new BadRequestError('Only JPEG and PNG images are allowed');
  if (file.size > 256 * 1024) throw new BadRequestError('File must be smaller than 256 KB');

  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
  try {
    await uploadFile(AVATARS_BUCKET, storagePath, file);
  } catch (e) {
    throw new BadRequestError((e as Error).message);
  }

  const avatarUrl = getPublicUrl(AVATARS_BUCKET, storagePath);
  await db
    .insert(userProfiles)
    .values({ userId: user.id, avatar: avatarUrl })
    .onConflictDoUpdate({ target: userProfiles.userId, set: { avatar: avatarUrl } });
  await logAction(db, user.id, 'Updated avatar');
  return { avatarUrl };
}

export async function getSettings(user: AuthUser) {
  const [settings] = await db
    .select({ notificationsEnabled: userSettings.notificationsEnabled, lightTheme: userSettings.lightTheme })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .catch(() => [null]);
  return { notificationsEnabled: settings?.notificationsEnabled ?? true, lightTheme: settings?.lightTheme ?? true };
}

export async function updateSettings(user: AuthUser, body: UpdateSettingsInput) {
  const values = {
    userId: user.id,
    ...(body.notificationsEnabled !== undefined && { notificationsEnabled: body.notificationsEnabled }),
    ...(body.lightTheme !== undefined && { lightTheme: body.lightTheme }),
  };
  let updated;
  try {
    [updated] = await db.insert(userSettings).values(values).onConflictDoUpdate({ target: userSettings.userId, set: values }).returning();
  } catch {
    updated = { ...values };
  }
  await logAction(db, user.id, 'Updated settings');
  return updated;
}

export async function changePassword(user: AuthUser, body: ChangePasswordInput) {
  const [userData] = await db.select({ authId: users.authId }).from(users).where(eq(users.id, user.id));
  if (!userData?.authId) throw new InternalError('User auth ID not found');

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new InternalError('Server misconfiguration');

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userData.authId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: body.newPassword }),
  });
  if (!response.ok) throw new InternalError('Failed to update password');

  await logAction(db, user.id, 'Changed password');
  return { success: true };
}

export async function searchUsers(q: string | undefined) {
  if (!q || q.length < 2) throw new BadRequestError('Search query must be at least 2 characters');
  return db
    .select({ id: users.id, login: users.login, email: users.email, name: userProfiles.name })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(isNull(users.deletedAt), or(ilike(users.login, `%${q}%`), ilike(users.email, `%${q}%`), ilike(userProfiles.name, `%${q}%`))))
    .limit(20);
}

export async function getCalendarToken(user: AuthUser) {
  const [settings] = await db
    .select({ calendarToken: userSettings.calendarToken })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));
  if (settings?.calendarToken) return { token: settings.calendarToken };

  const token = crypto.randomUUID();
  await db.insert(userSettings).values({ userId: user.id, calendarToken: token }).onConflictDoUpdate({ target: userSettings.userId, set: { calendarToken: token } });
  return { token };
}

export async function regenerateCalendarToken(user: AuthUser) {
  const token = crypto.randomUUID();
  await db.insert(userSettings).values({ userId: user.id, calendarToken: token }).onConflictDoUpdate({ target: userSettings.userId, set: { calendarToken: token } });
  await logAction(db, user.id, 'Regenerated calendar token');
  return { token };
}

export async function connectIntegration(user: AuthUser, service: string) {
  await db
    .insert(userIntegrations)
    .values({ userId: user.id, service, connected: true, connectedAt: new Date() })
    .onConflictDoUpdate({ target: [userIntegrations.userId, userIntegrations.service], set: { connected: true, connectedAt: new Date() } });
  return { success: true };
}

export async function disconnectIntegration(user: AuthUser, service: string) {
  const [row] = await db
    .select()
    .from(userIntegrations)
    .where(and(eq(userIntegrations.userId, user.id), eq(userIntegrations.service, service)));
  if (!row) throw new NotFoundError('Integration not found');
  await db
    .update(userIntegrations)
    .set({ connected: false, connectedAt: null })
    .where(and(eq(userIntegrations.userId, user.id), eq(userIntegrations.service, service)));
  return { success: true };
}

export async function getUserById(id: number) {
  if (isNaN(id)) throw new BadRequestError('User ID must be a number');
  const [row] = await db
    .select({ id: users.id, login: users.login, name: userProfiles.name, title: userProfiles.title, avatar: userProfiles.avatar, organization: userProfiles.organization, bio: userProfiles.bio })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(eq(users.id, id), isNull(users.deletedAt)));
  if (!row) throw new NotFoundError('User not found');
  return row;
}
