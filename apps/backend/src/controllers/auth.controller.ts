import { db } from '../db';
import { users, userProfiles, roles, userRoles } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { eq } from 'drizzle-orm';

type NewUser = typeof users.$inferInsert;

export async function syncUser(body: { email: string; authId: string; fullName?: string }) {
  const { email, authId, fullName } = body;

  const existing = await db.select().from(users).where(eq(users.authId, authId));
  if (existing.length > 0) return existing[0];

  const login = email.split('@')[0] + '_' + authId.substring(0, 4);
  const newUserData: NewUser = { email, login, pwdHash: '', authId };
  const [newUser] = await db.insert(users).values(newUserData).returning();

  await db.insert(userProfiles).values({ userId: newUser.id, name: fullName || null });

  const [userRole] = await db.select().from(roles).where(eq(roles.name, 'USER'));
  if (userRole) {
    await db.insert(userRoles).values({ userId: newUser.id, roleId: userRole.id });
  }

  return newUser;
}

export async function logout(user: AuthUser) {
  await db.update(users).set({ activeSession: false }).where(eq(users.id, user.id));
  return { success: true, message: 'Logged out successfully' };
}
