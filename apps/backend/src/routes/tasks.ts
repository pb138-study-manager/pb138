import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as TasksController from '../controllers/tasks.controller';

const EvalSchema = z.object({ score: z.number().int().min(0), feedback: z.string() });
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

export type EvalInput = z.infer<typeof EvalSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type AssignTaskInput = z.infer<typeof AssignTaskSchema>;

export const tasksRoutes = new Elysia({ prefix: '/tasks' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', ({ user }) => TasksController.listTasks(user as AuthUser))
  .post('/', ({ user, body }) => TasksController.createTask(user as AuthUser, body), zodBody(CreateTaskSchema))
  .get('/:id', ({ user, params }) => TasksController.getTask(user as AuthUser, Number(params.id)))
  .patch('/:id', ({ user, params, body }) => TasksController.updateTask(user as AuthUser, Number(params.id), body), zodBody(UpdateTaskSchema))
  .delete('/:id', ({ user, params }) => TasksController.deleteTask(user as AuthUser, Number(params.id)))
  .patch('/:id/toggle-done', ({ user, params }) => TasksController.toggleDone(user as AuthUser, Number(params.id)))
  .post('/:id/eval', ({ user, params, body }) => TasksController.createEval(user as AuthUser, Number(params.id), body), zodBody(EvalSchema))
  .get('/:id/eval', ({ user, params }) => TasksController.getEval(user as AuthUser, Number(params.id)))
  .post('/assign', ({ user, body }) => TasksController.assignTask(user as AuthUser, body), zodBody(AssignTaskSchema));
