import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as AuthController from '../controllers/auth.controller';

const SyncBodySchema = z.object({
  email: z.string().email(),
  authId: z.string(),
  fullName: z.string().optional(),
});

export type SyncBodyInput = z.infer<typeof SyncBodySchema>;

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/sync', ({ body }) => AuthController.syncUser(body), zodBody(SyncBodySchema))
  .use(authMiddleware)
  .post('/logout', ({ user }) => AuthController.logout(user as AuthUser));
