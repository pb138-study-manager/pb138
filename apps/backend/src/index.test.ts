import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

const app = new Elysia()
  .use(cors())
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

describe('Backend', () => {
  it('GET /health returns ok status', async () => {
    const response = await app.handle(new Request('http://localhost/health'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });
});
