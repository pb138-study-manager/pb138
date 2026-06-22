import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { tasksRoutes } from './routes/tasks';
import { eventsRoutes, eventsIcalRoute } from './routes/events';
import { foldersRoutes } from './routes/folders';
import { notesRoutes } from './routes/notes';
import { coursesRoutes } from './routes/courses';
import { usersRoutes } from './routes/users';
import { groupsRoutes } from './routes/groups';
import { materialsRoutes } from './routes/materials';
import { adminRoutes } from './routes/admin';
import { aiRoutes } from './routes/ai';
import { searchRoutes } from './routes/search';
import { AppError } from './lib/errors';

const PORT = process.env.PORT ?? 3001;

const app = new Elysia()
  .use(cors())
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.status;
      return { error: error.code, message: error.message };
    }
    set.status = 500;
    return { error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' };
  })
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))
  .use(authRoutes)
  .use(eventsIcalRoute)
  .group('', (app) =>
    app
      .use(authMiddleware)
      .use(tasksRoutes)
      .use(eventsRoutes)
      .use(foldersRoutes)
      .use(notesRoutes)
      .use(coursesRoutes)
      .use(usersRoutes)
      .use(groupsRoutes)
      .use(materialsRoutes)
      .use(adminRoutes)
      .use(aiRoutes)
      .use(searchRoutes)
  )
  .listen(PORT);

console.log(`Backend running at http://localhost:${PORT}`);
export type App = typeof app;
