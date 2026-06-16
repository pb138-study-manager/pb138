import { Elysia } from 'elysia';
import { z } from 'zod';
import { db } from '../db';
import { tasks, evals, assignments, users } from '../db/schema';
import type { AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { zodBody } from '../lib/validation';

const EvalSchema = z.object({
  score: z.number().int().min(0),
  feedback: z.string(),
});

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  assignmentId: z.number().optional(),
  parentId: z.number().optional(),
  courseId: z.number().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['TODO', 'IN PROGRESS', 'DONE']).optional(),
  parentId: z.number().nullable().optional(),
  courseId: z.number().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});

const AssignTaskSchema = z.object({
  studentId: z.number().int().positive(),
  title: z.string().min(1),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  courseId: z.number().optional(),
});

export const tasksRoutes = new Elysia({ prefix: '/tasks' })
  .get('/', async ({ user }) => {
    const authUser = user as AuthUser;
    const parentTasks = await db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        assignmentId: tasks.assignmentId,
        courseId: tasks.courseId,
        parentId: tasks.parentId,
        title: tasks.title,
        description: tasks.description,
        dueDate: tasks.dueDate,
        status: tasks.status,
        priority: tasks.priority,
        tags: tasks.tags,
        deletedAt: tasks.deletedAt,
        assignmentDeadline: assignments.dueDate,
        evalId: evals.id,
        evalScore: evals.score,
        evalFeedback: evals.feedback,
        evalEvaluatedAt: evals.evaluatedAt,
      })
      .from(tasks)
      .leftJoin(assignments, eq(tasks.assignmentId, assignments.id))
      .leftJoin(evals, eq(evals.taskId, tasks.id))
      .where(and(eq(tasks.userId, authUser.id), isNull(tasks.deletedAt), isNull(tasks.parentId)));

    const allSubtasks = await db
      .select({ parentId: tasks.parentId, status: tasks.status })
      .from(tasks)
      .where(
        and(eq(tasks.userId, authUser.id), isNull(tasks.deletedAt), isNotNull(tasks.parentId))
      );

    const subtaskMap = new Map<number, { total: number; done: number }>();
    for (const sub of allSubtasks) {
      if (sub.parentId === null) continue;
      const entry = subtaskMap.get(sub.parentId) ?? { total: 0, done: 0 };
      entry.total++;
      if (sub.status === 'DONE') entry.done++;
      subtaskMap.set(sub.parentId, entry);
    }

    return parentTasks.map(({ evalId, evalScore, evalFeedback, evalEvaluatedAt, ...task }) => ({
      ...task,
      assignmentDeadline: task.assignmentDeadline?.toISOString() ?? null,
      subtaskCount: subtaskMap.get(task.id)?.total ?? 0,
      doneSubtaskCount: subtaskMap.get(task.id)?.done ?? 0,
      eval:
        evalId != null
          ? {
              id: evalId,
              taskId: task.id,
              score: evalScore!,
              feedback: evalFeedback!,
              evaluatedAt: evalEvaluatedAt!.toISOString(),
            }
          : null,
    }));
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
          ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
          description: body.description,
          assignmentId: body.assignmentId,
          parentId: body.parentId,
          courseId: body.courseId,
          ...(body.priority !== undefined && { priority: body.priority }),
          ...(body.tags !== undefined && { tags: body.tags }),
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
    const [evalRow] = await db.select().from(evals).where(eq(evals.taskId, task.id));
    return {
      ...task,
      subtasks,
      eval: evalRow
        ? {
            id: evalRow.id,
            taskId: evalRow.taskId,
            score: evalRow.score,
            feedback: evalRow.feedback,
            evaluatedAt: evalRow.evaluatedAt.toISOString(),
          }
        : null,
    };
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
          ...('courseId' in body && { courseId: body.courseId }),
          ...('priority' in body && { priority: body.priority ?? null }),
          ...(body.tags !== undefined && { tags: body.tags }),
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
      .set({ status: newStatus, completedAt: newStatus === 'DONE' ? new Date() : null })
      .where(eq(tasks.id, existing.id))
      .returning();
    await logAction(db, (user as AuthUser).id, `Toggled task ${existing.id} to ${newStatus}`);
    return updated;
  })
  .post(
    '/:id/eval',
    async ({ params, body, user, set }) => {
      const authUser = user as AuthUser;
      if (!authUser.roles.includes('TEACHER')) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Only teachers can evaluate tasks' };
      }
      const [task] = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, Number(params.id)), isNull(tasks.deletedAt)));
      if (!task) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Task not found' };
      }
      if (task.status !== 'DONE') {
        set.status = 400;
        return { error: 'TASK_NOT_DONE', message: 'Task must be DONE before it can be evaluated' };
      }
      const [existing] = await db.select().from(evals).where(eq(evals.taskId, task.id));
      let evalRow;
      if (existing) {
        const [updated] = await db
          .update(evals)
          .set({ score: body.score, feedback: body.feedback, evaluatedAt: new Date() })
          .where(eq(evals.id, existing.id))
          .returning();
        evalRow = updated;
        await logAction(db, authUser.id, `Updated eval for task ${task.id}`);
      } else {
        const [created] = await db
          .insert(evals)
          .values({
            taskId: task.id,
            score: body.score,
            feedback: body.feedback,
            evaluatedAt: new Date(),
          })
          .returning();
        evalRow = created;
        await logAction(db, authUser.id, `Created eval for task ${task.id}`);
      }
      return evalRow;
    },
    zodBody(EvalSchema)
  )
  .get('/:id/eval', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, Number(params.id)), isNull(tasks.deletedAt)));
    if (!task) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Task not found' };
    }
    if (task.userId !== authUser.id && !authUser.roles.includes('TEACHER')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Access denied' };
    }
    const [evalRow] = await db.select().from(evals).where(eq(evals.taskId, task.id));
    if (!evalRow) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'No evaluation yet' };
    }
    return evalRow;
  })
  .post(
    '/assign',
    async ({ body, user, set }) => {
      const authUser = user as AuthUser;
      if (!authUser.roles.includes('TEACHER')) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Only teachers can assign tasks to students' };
      }
      const [student] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, body.studentId));
      if (!student) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Student not found' };
      }
      const [task] = await db
        .insert(tasks)
        .values({
          userId: body.studentId,
          title: body.title,
          ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
          description: body.description,
          courseId: body.courseId,
        })
        .returning();
      await logAction(
        db,
        authUser.id,
        `Teacher assigned task ${task.id} to student ${body.studentId}`
      );
      return task;
    },
    zodBody(AssignTaskSchema)
  );
