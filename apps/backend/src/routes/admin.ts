import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as AdminController from '../controllers/admin.controller';

const PatchRolesSchema = z.object({
  add: z.array(z.enum(['USER', 'ADMIN', 'TEACHER'])).optional(),
  remove: z.array(z.enum(['USER', 'ADMIN', 'TEACHER'])).optional(),
});

const ReactivateSchema = z.object({
  restoreData: z.boolean().optional(),
});

export type PatchRolesInput = z.infer<typeof PatchRolesSchema>;
export type ReactivateInput = z.infer<typeof ReactivateSchema>;

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
    if (!(user as AuthUser).roles.includes('ADMIN')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Admin access required' };
    }
  })
  .get('/users', ({ query }) => AdminController.listUsers(query as Record<string, string>))
  .patch('/users/:id/roles', ({ params, body, user }) => AdminController.patchUserRoles(user as AuthUser, Number(params.id), body), zodBody(PatchRolesSchema))
  .delete('/users/:id', ({ params, user }) => AdminController.deactivateUser(user as AuthUser, Number(params.id)))
  .post('/users/:id/reactivate', ({ params, body, user }) => AdminController.reactivateUser(user as AuthUser, Number(params.id), body), zodBody(ReactivateSchema))
  .get('/audit-logs', ({ query }) => AdminController.listAuditLogs(query as Record<string, string>))
  .get('/roles', () => AdminController.listRoles());
