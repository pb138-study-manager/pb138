import { db } from '../db';
import { tasks, evals, assignments, users } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, BadRequestError } from '../lib/errors';
import type { CreateTaskInput, UpdateTaskInput, EvalInput, AssignTaskInput } from '../routes/tasks';

export async function listTasks(user: AuthUser) {
  const parentTasks = await db
    .select({
      id: tasks.id, userId: tasks.userId, assignmentId: tasks.assignmentId,
      courseId: tasks.courseId, parentId: tasks.parentId, title: tasks.title,
      description: tasks.description, dueDate: tasks.dueDate, status: tasks.status,
      priority: tasks.priority, tags: tasks.tags, deletedAt: tasks.deletedAt,
      assignmentDeadline: assignments.dueDate,
      evalId: evals.id, evalScore: evals.score, evalFeedback: evals.feedback, evalEvaluatedAt: evals.evaluatedAt,
    })
    .from(tasks)
    .leftJoin(assignments, eq(tasks.assignmentId, assignments.id))
    .leftJoin(evals, eq(evals.taskId, tasks.id))
    .where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt), isNull(tasks.parentId)));

  const allSubtasks = await db
    .select({ parentId: tasks.parentId, status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt), isNotNull(tasks.parentId)));

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
    eval: evalId != null
      ? { id: evalId, taskId: task.id, score: evalScore!, feedback: evalFeedback!, evaluatedAt: evalEvaluatedAt!.toISOString() }
      : null,
  }));
}

export async function createTask(user: AuthUser, body: CreateTaskInput) {
  if (body.parentId !== undefined) {
    const [parent] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, body.parentId), eq(tasks.userId, user.id), isNull(tasks.deletedAt), isNull(tasks.parentId)));
    if (!parent) throw new NotFoundError('Parent task not found or is itself a subtask');
  }
  const [task] = await db
    .insert(tasks)
    .values({
      userId: user.id,
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
  await logAction(db, user.id, `Created task ${task.id}: ${task.title}`);
  return task;
}

export async function getTask(user: AuthUser, id: number) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id), isNull(tasks.deletedAt)));
  if (!task) throw new NotFoundError('Task not found or access denied');

  const subtasks = await db.select().from(tasks).where(and(eq(tasks.parentId, task.id), isNull(tasks.deletedAt)));
  const [evalRow] = await db.select().from(evals).where(eq(evals.taskId, task.id));
  return {
    ...task,
    subtasks,
    eval: evalRow
      ? { id: evalRow.id, taskId: evalRow.taskId, score: evalRow.score, feedback: evalRow.feedback, evaluatedAt: evalRow.evaluatedAt.toISOString() }
      : null,
  };
}

export async function updateTask(user: AuthUser, id: number, body: UpdateTaskInput) {
  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id), isNull(tasks.deletedAt)));
  if (!existing) throw new NotFoundError('Task not found or access denied');

  if (body.parentId !== undefined && body.parentId !== null) {
    const [parent] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, body.parentId), eq(tasks.userId, user.id), isNull(tasks.deletedAt), isNull(tasks.parentId)));
    if (!parent) throw new NotFoundError('Parent task not found or is itself a subtask');
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
  await logAction(db, user.id, `Updated task ${existing.id}`);
  return updated;
}

export async function deleteTask(user: AuthUser, id: number) {
  const isAdmin = user.roles.includes('ADMIN');
  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), isAdmin ? undefined : eq(tasks.userId, user.id), isNull(tasks.deletedAt)));
  if (!existing) throw new NotFoundError('Task not found or access denied');

  const subtasksToDelete = await db.select().from(tasks).where(and(eq(tasks.parentId, existing.id), isNull(tasks.deletedAt)));
  for (const sub of subtasksToDelete) {
    await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, sub.id));
    await logAction(db, user.id, `Deleted subtask ${sub.id} (cascade from ${existing.id})`);
  }
  await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, existing.id));
  await logAction(db, user.id, `Deleted task ${existing.id}`);
  return { success: true };
}

export async function toggleDone(user: AuthUser, id: number) {
  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id), isNull(tasks.deletedAt)));
  if (!existing) throw new NotFoundError('Task not found or access denied');

  const newStatus = existing.status === 'DONE' ? 'TODO' : 'DONE';
  const [updated] = await db
    .update(tasks)
    .set({ status: newStatus, completedAt: newStatus === 'DONE' ? new Date() : null })
    .where(eq(tasks.id, existing.id))
    .returning();
  await logAction(db, user.id, `Toggled task ${existing.id} to ${newStatus}`);
  return updated;
}

export async function createEval(user: AuthUser, id: number, body: EvalInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('Only teachers can evaluate tasks');

  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, id), isNull(tasks.deletedAt)));
  if (!task) throw new NotFoundError('Task not found');
  if (task.status !== 'DONE') throw new BadRequestError('Task must be DONE before it can be evaluated');

  const [existing] = await db.select().from(evals).where(eq(evals.taskId, task.id));
  if (existing) {
    const [updated] = await db
      .update(evals)
      .set({ score: body.score, feedback: body.feedback, evaluatedAt: new Date() })
      .where(eq(evals.id, existing.id))
      .returning();
    await logAction(db, user.id, `Updated eval for task ${task.id}`);
    return updated;
  }
  const [created] = await db
    .insert(evals)
    .values({ taskId: task.id, score: body.score, feedback: body.feedback, evaluatedAt: new Date() })
    .returning();
  await logAction(db, user.id, `Created eval for task ${task.id}`);
  return created;
}

export async function getEval(user: AuthUser, id: number) {
  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, id), isNull(tasks.deletedAt)));
  if (!task) throw new NotFoundError('Task not found');
  if (task.userId !== user.id && !user.roles.includes('TEACHER')) throw new ForbiddenError('Access denied');

  const [evalRow] = await db.select().from(evals).where(eq(evals.taskId, task.id));
  if (!evalRow) throw new NotFoundError('No evaluation yet');
  return evalRow;
}

export async function assignTask(user: AuthUser, body: AssignTaskInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('Only teachers can assign tasks to students');

  const [student] = await db.select({ id: users.id }).from(users).where(eq(users.id, body.studentId));
  if (!student) throw new NotFoundError('Student not found');

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
  await logAction(db, user.id, `Teacher assigned task ${task.id} to student ${body.studentId}`);
  return task;
}
