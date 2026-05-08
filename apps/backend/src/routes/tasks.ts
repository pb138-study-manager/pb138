import { Elysia } from 'elysia';
import { z } from 'zod';
import { db } from '../db';
import { tasks } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull } from 'drizzle-orm';
import { zodBody } from '../lib/validation';

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string(),
  description: z.string().optional(),
  assignmentId: z.number().optional(),
  parentId: z.number().optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['TODO', 'IN PROGRESS', 'DONE']).optional(),
  parentId: z.number().nullable().optional(),
});

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
      .where(
        and(
          eq(tasks.userId, (user as AuthUser).id),
          isNull(tasks.deletedAt),
          isNull(tasks.parentId)
        )
      );
  })
  .post(
    '/',
    async ({ body, user, set }) => {
      if (body.parentId !== undefined) {
        const [parent] = await db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.id, body.parentId),
              eq(tasks.userId, (user as AuthUser).id),
              isNull(tasks.deletedAt),
              isNull(tasks.parentId)
            )
          );
        if (!parent) {
          set.status = 404;
          return { error: 'NOT_FOUND', message: 'Parent task not found or is itself a subtask' };
        }
      }
      const [task] = await db
        .insert(tasks)
        .values({
          userId: (user as AuthUser).id,
          title: body.title,
          dueDate: new Date(body.dueDate),
          description: body.description,
          assignmentId: body.assignmentId,
          parentId: body.parentId,
        })
        .returning();
      await logAction(db, (user as AuthUser).id, `Created task ${task.id}: ${task.title}`);
      return task;
    },
    zodBody(CreateTaskSchema)
  )
  .get('/:id', async ({ params, user, set }) => {
    const [task] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, Number(params.id)),
          eq(tasks.userId, (user as AuthUser).id),
          isNull(tasks.deletedAt)
        )
      );
    if (!task) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Task not found or access denied' };
    }
    const subtasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.parentId, task.id), isNull(tasks.deletedAt)));
    return { ...task, subtasks };
  })
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
      if (body.parentId !== undefined && body.parentId !== null) {
        const [parent] = await db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.id, body.parentId),
              eq(tasks.userId, (user as AuthUser).id),
              isNull(tasks.deletedAt),
              isNull(tasks.parentId)
            )
          );
        if (!parent) {
          set.status = 404;
          return { error: 'NOT_FOUND', message: 'Parent task not found or is itself a subtask' };
        }
      }
      const [updated] = await db
        .update(tasks)
        .set({
          ...(body.title !== undefined && { title: body.title }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
          ...(body.status !== undefined && { status: body.status }),
          ...('parentId' in body && { parentId: body.parentId }),
        })
        .where(eq(tasks.id, existing.id))
        .returning();
      await logAction(db, (user as AuthUser).id, `Updated task ${existing.id}`);
      return updated;
    },
    zodBody(UpdateTaskSchema)
  )
  .delete('/:id', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    const isAdmin = authUser.roles.includes('ADMIN');
    const [existing] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, Number(params.id)),
          isAdmin ? undefined : eq(tasks.userId, authUser.id),
          isNull(tasks.deletedAt)
        )
      );
    if (!existing) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Task not found or access denied' };
    }
    const subtasksToDelete = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.parentId, existing.id), isNull(tasks.deletedAt)));
    for (const sub of subtasksToDelete) {
      await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, sub.id));
      await logAction(db, authUser.id, `Deleted subtask ${sub.id} (cascade from ${existing.id})`);
    }
    await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, existing.id));
    await logAction(db, authUser.id, `Deleted task ${existing.id}`);
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
