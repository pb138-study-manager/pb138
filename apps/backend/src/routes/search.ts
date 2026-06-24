import { Elysia } from 'elysia';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import * as SearchController from '../controllers/search.controller';

export const searchRoutes = new Elysia({ prefix: '/search' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', ({ user, query }) => SearchController.search(user as AuthUser, String(query.q ?? '')));
