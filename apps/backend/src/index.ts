import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

const PORT = process.env.PORT ?? 3001;

const app = new Elysia()
  .use(cors())
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))
  .listen(PORT);

app.get('/', () => '<h1>Hello from Backend!</h1>', {
  type: 'text/html'
})

console.log(`Backend running at http://localhost:${PORT}`);

export type App = typeof app;
