import { Elysia } from 'elysia';
import { z } from 'zod';
import { db } from '../db';
import { notes, folders } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull } from 'drizzle-orm';
import { zodBody } from '../lib/validation';

const CreateNoteSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  folderId: z.number().optional(),
  courseId: z.number().optional(),
});

const UpdateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  folderId: z.number().nullable().optional(),
  courseId: z.number().nullable().optional(),
});

export const notesRoutes = new Elysia({ prefix: '/notes' })
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
      .from(notes)
      .where(and(eq(notes.userId, (user as AuthUser).id), isNull(notes.deletedAt)));
  })
  .post(
    '/',
    async ({ body, user, set }) => {
      if (body.folderId !== undefined) {
        const [folder] = await db
          .select()
          .from(folders)
          .where(
            and(
              eq(folders.id, body.folderId),
              eq(folders.userId, (user as AuthUser).id),
              isNull(folders.deletedAt)
            )
          );
        if (!folder) {
          set.status = 404;
          return { error: 'NOT_FOUND', message: 'Folder not found or access denied' };
        }
      }
      const [note] = await db
        .insert(notes)
        .values({
          userId: (user as AuthUser).id,
          title: body.title,
          description: body.description,
          folderId: body.folderId,
          courseId: body.courseId,
        })
        .returning();
      await logAction(db, (user as AuthUser).id, `Created note ${note.id}: ${note.title}`);
      return note;
    },
    zodBody(CreateNoteSchema)
  )
  .get('/:id', async ({ params, user, set }) => {
    const [note] = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.id, Number(params.id)),
          eq(notes.userId, (user as AuthUser).id),
          isNull(notes.deletedAt)
        )
      );
    if (!note) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Note not found or access denied' };
    }
    return note;
  })
  .patch(
    '/:id',
    async ({ params, body, user, set }) => {
      const [existing] = await db
        .select()
        .from(notes)
        .where(
          and(
            eq(notes.id, Number(params.id)),
            eq(notes.userId, (user as AuthUser).id),
            isNull(notes.deletedAt)
          )
        );
      if (!existing) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Note not found or access denied' };
      }
      if (body.folderId !== undefined) {
        const [folder] = await db
          .select()
          .from(folders)
          .where(
            and(
              eq(folders.id, body.folderId),
              eq(folders.userId, (user as AuthUser).id),
              isNull(folders.deletedAt)
            )
          );
        if (!folder) {
          set.status = 404;
          return { error: 'NOT_FOUND', message: 'Folder not found or access denied' };
        }
      }
      const [updated] = await db
        .update(notes)
        .set({
          ...(body.title !== undefined && { title: body.title }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.folderId !== undefined && { folderId: body.folderId }),
          ...(body.courseId !== undefined && { courseId: body.courseId }),
        })
        .where(eq(notes.id, existing.id))
        .returning();
      await logAction(db, (user as AuthUser).id, `Updated note ${existing.id}`);
      return updated;
    },
    zodBody(UpdateNoteSchema)
  )
  .delete('/:id', async ({ params, user, set }) => {
    const [existing] = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.id, Number(params.id)),
          eq(notes.userId, (user as AuthUser).id),
          isNull(notes.deletedAt)
        )
      );
    if (!existing) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Note not found or access denied' };
    }
    await db.update(notes).set({ deletedAt: new Date() }).where(eq(notes.id, existing.id));
    await logAction(db, (user as AuthUser).id, `Deleted note ${existing.id}`);
    return { success: true };
  });
