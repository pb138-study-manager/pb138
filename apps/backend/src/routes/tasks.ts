import { Elysia, t } from 'elysia';
import { db } from '../db';
import { tasks } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull } from 'drizzle-orm';

export const tasksRoutes = new Elysia({ prefix: '/tasks' })
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
      .from(tasks)
      .where(and(eq(tasks.userId, (user as AuthUser).id), isNull(tasks.deletedAt)));
  })
  .post(
    '/',
    async ({ body, user }) => {
      const [task] = await db
        .insert(tasks)
        .values({
          userId: (user as AuthUser).id,
          title: body.title,
          dueDate: new Date(body.dueDate),
          description: body.description,
          assignmentId: body.assignmentId,
        })
        .returning();
      await logAction(db, (user as AuthUser).id, `Created task ${task.id}: ${task.title}`);
      return task;
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        dueDate: t.String(),
        description: t.Optional(t.String()),
        assignmentId: t.Optional(t.Number()),
      }),
    }
  )
  .patch(
    '/:id',
    async ({ params, body, user, set }) => {
      const [existing] = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.id, Number(params.id)),
            eq(tasks.userId, (user as AuthUser).id),
            isNull(tasks.deletedAt)
          )
        );
      if (!existing) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Task not found or access denied' };
      }
      const [updated] = await db
        .update(tasks)
        .set({
          ...(body.title !== undefined && { title: body.title }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
          ...(body.status !== undefined && { status: body.status }),
        })
        .where(eq(tasks.id, existing.id))
        .returning();
      await logAction(db, (user as AuthUser).id, `Updated task ${existing.id}`);
      return updated;
    },
    {
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String()),
        dueDate: t.Optional(t.String()),
        status: t.Optional(
          t.Union([t.Literal('TODO'), t.Literal('IN PROGRESS'), t.Literal('DONE')])
        ),
      }),
    }
  )
  .delete('/:id', async ({ params, user, set }) => {
    const [existing] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, Number(params.id)),
          eq(tasks.userId, (user as AuthUser).id),
          isNull(tasks.deletedAt)
        )
      );
    if (!existing) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Task not found or access denied' };
    }
    await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, existing.id));
    await logAction(db, (user as AuthUser).id, `Deleted task ${existing.id}`);
    return { success: true };
  })
  .patch('/:id/toggle-done', async ({ params, user, set }) => {
    const [existing] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, Number(params.id)),
          eq(tasks.userId, (user as AuthUser).id),
          isNull(tasks.deletedAt)
        )
      );
    if (!existing) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Task not found or access denied' };
    }
    const newStatus = existing.status === 'DONE' ? 'TODO' : 'DONE';
    const [updated] = await db
      .update(tasks)
      .set({ status: newStatus })
      .where(eq(tasks.id, existing.id))
      .returning();
    await logAction(db, (user as AuthUser).id, `Toggled task ${existing.id} to ${newStatus}`);
    return updated;
  });
