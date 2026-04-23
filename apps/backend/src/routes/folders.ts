import { Elysia } from 'elysia';
import { db } from '../db';
import { folders } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { eq, and, isNull } from 'drizzle-orm';

export const foldersRoutes = new Elysia({ prefix: '/folders' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', async ({ user }) => {
    return db
      .select()
      .from(folders)
      .where(and(eq(folders.userId, (user as AuthUser).id), isNull(folders.deletedAt)));
  });
