import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as UsersController from '../controllers/users.controller';

const UpdateProfileSchema = z.object({
  name: z.string().nullish(),
  title: z.string().nullish(),
  organization: z.string().nullish(),
  bio: z.string().nullish(),
  login: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
});
const UpdateSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  lightTheme: z.boolean().optional(),
  language: z.enum(['en', 'cs']).optional(),
  customNav: z.any().optional(),
});
const ChangePasswordSchema = z.object({ newPassword: z.string().min(8) });

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const usersRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/me', ({ user }) => UsersController.getMe(user as AuthUser))
  .patch('/me/profile', ({ user, body }) => UsersController.updateProfile(user as AuthUser, body), zodBody(UpdateProfileSchema))
  .post('/me/avatar', ({ user, request }) => UsersController.uploadAvatar(user as AuthUser, request))
  .get('/me/settings', ({ user }) => UsersController.getSettings(user as AuthUser))
  .patch('/me/settings', ({ user, body }) => UsersController.updateSettings(user as AuthUser, body), zodBody(UpdateSettingsSchema))
  .patch('/me/password', ({ user, body }) => UsersController.changePassword(user as AuthUser, body), zodBody(ChangePasswordSchema))
  .get('/search', ({ query }) => UsersController.searchUsers(query.q as string | undefined))
  .get('/me/calendar-token', ({ user }) => UsersController.getCalendarToken(user as AuthUser))
  .post('/me/calendar-token', ({ user }) => UsersController.regenerateCalendarToken(user as AuthUser))
  .post('/me/integrations/:service', ({ user, params }) => UsersController.connectIntegration(user as AuthUser, params.service))
  .delete('/me/integrations/:service', ({ user, params }) => UsersController.disconnectIntegration(user as AuthUser, params.service))
  .get('/:id', ({ params }) => UsersController.getUserById(parseInt(params.id, 10)));
