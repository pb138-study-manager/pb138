import { Elysia, t } from 'elysia';
import { db } from '../db';
import { folders, notes } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
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
  })
  .post(
    '/',
    async ({ body, user }) => {
      const [folder] = await db
        .insert(folders)
        .values({
          userId: (user as AuthUser).id,
          name: body.name,
        })
        .returning();
      await logAction(db, (user as AuthUser).id, `Created folder ${folder.id}: ${folder.name}`);
      return folder;
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
      }),
    }
  )
  .patch(
    '/:id',
    async ({ params, body, user, set }) => {
      const [existing] = await db
        .select()
        .from(folders)
        .where(
          and(
            eq(folders.id, Number(params.id)),
            eq(folders.userId, (user as AuthUser).id),
            isNull(folders.deletedAt)
          )
        );
      if (!existing) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Folder not found or access denied' };
      }
      const [updated] = await db
        .update(folders)
        .set({ name: body.name })
        .where(eq(folders.id, existing.id))
        .returning();
      await logAction(db, (user as AuthUser).id, `Updated folder ${existing.id}`);
      return updated;
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
      }),
    }
  )
  .delete('/:id', async ({ params, user, set }) => {
    const [existing] = await db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.id, Number(params.id)),
          eq(folders.userId, (user as AuthUser).id),
          isNull(folders.deletedAt)
        )
      );
    if (!existing) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Folder not found or access denied' };
    }
    await db
      .update(notes)
      .set({ folderId: null })
      .where(and(eq(notes.folderId, existing.id), eq(notes.userId, (user as AuthUser).id)));
    await db.update(folders).set({ deletedAt: new Date() }).where(eq(folders.id, existing.id));
    await logAction(db, (user as AuthUser).id, `Deleted folder ${existing.id}`);
    return { success: true };
  });
