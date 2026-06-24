import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as AiController from '../controllers/ai.controller';
import { agent } from '../controllers/ai.agent.controller';

const BriefSchema = z.object({ lang: z.string().optional() });
const ChatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
  lang: z.string().optional(),
});
const QuizLangSchema = z.object({ lang: z.string().optional() });
const AgentSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
  confirm: z.object({ name: z.string(), args: z.record(z.unknown()) }).optional(),
  lang: z.string().optional(),
});

export type BriefInput = z.infer<typeof BriefSchema>;
export type ChatInput = z.infer<typeof ChatSchema>;
export type QuizLangInput = z.infer<typeof QuizLangSchema>;
export type AgentInput = z.infer<typeof AgentSchema>;

export const aiRoutes = new Elysia({ prefix: '/ai' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .post('/brief', ({ user, body }) => AiController.brief(user as AuthUser, body), zodBody(BriefSchema))
  .post('/chat', ({ user, body }) => AiController.chat(user as AuthUser, body), zodBody(ChatSchema))
  .post('/notes/:id/quiz', ({ user, params, body }) => AiController.quiz(user as AuthUser, Number(params.id), body), zodBody(QuizLangSchema))
  .post('/notes/:id/chat', ({ user, params, body }) => AiController.noteChat(user as AuthUser, Number(params.id), body), zodBody(ChatSchema))
  .post('/agent', ({ user, body, request }) => agent(user as AuthUser, body, request.headers.get('authorization') ?? ''), zodBody(AgentSchema))
  .get('/day_summary', ({ user, query }) => AiController.daySummary(user as AuthUser, (query.lang as string | undefined) ?? 'sk'))
  .get('/timeline_summary', ({ user, query }) => AiController.timelineSummary(user as AuthUser, (query.lang as string | undefined) ?? 'sk'));
