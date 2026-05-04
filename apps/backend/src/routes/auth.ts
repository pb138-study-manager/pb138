import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users, userProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth';

type NewUser = typeof users.$inferInsert;

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post(
    '/sync',
    async ({ body }) => {
      const { email, authId, fullName } = body;

      // Check if user already exists in public.users to keep it idempotent
      const existing = await db.select().from(users).where(eq(users.authId, authId));
      if (existing.length > 0) {
        return existing[0];
      }

      // Create a unique local login from the email (e.g. test@email.com -> test_a1b2)
      const login = email.split('@')[0] + '_' + authId.substring(0, 4);

      const newUserData: NewUser = {
        email,
        login,
        pwdHash: '', // Handled securely inside Supabase
        authId,
      };

      // Insert into public.users
      const [newUser] = await db
        .insert(users)
        .values(newUserData)
        .returning();

      // Insert basic profile details
      await db.insert(userProfiles).values({
        userId: newUser.id,
        name: fullName || null,
      });

      return newUser;
    },
    {
      body: t.Object({
        email: t.String(),
        authId: t.String(),
        fullName: t.Optional(t.String()),
      }),
    }
  )
  .use(authMiddleware)
  .post('/logout', async ({ user }) => {
    await db
      .update(users)
      .set({ activeSession: false })
      .where(eq(users.id, (user as AuthUser).id));
      
    return { success: true, message: 'Logged out successfully' };
  });
