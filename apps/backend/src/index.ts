import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { tasksRoutes } from './routes/tasks';
import { eventsRoutes } from './routes/events';
import { foldersRoutes } from './routes/folders';
import { notesRoutes } from './routes/notes';
import { coursesRoutes } from './routes/courses';
import { usersRoutes } from './routes/users';
import { groupsRoutes } from './routes/groups';

const PORT = process.env.PORT ?? 3001;

const app = new Elysia()
  .use(cors())
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))
  .use(authRoutes)
  .use(authMiddleware)
  .use(tasksRoutes)
  .use(eventsRoutes)
  .use(foldersRoutes)
  .use(notesRoutes)
  .use(coursesRoutes)
  .use(usersRoutes)
  .use(groupsRoutes)
  .listen(PORT);

console.log(`Backend running at http://localhost:${PORT}`);

export type App = typeof app;
