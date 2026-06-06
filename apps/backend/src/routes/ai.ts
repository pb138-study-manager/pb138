import { Elysia } from 'elysia';
import { z } from 'zod';
import OpenAI from 'openai';
import { db } from '../db';
import { tasks, events, courses, notes, userCourses } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, lte } from 'drizzle-orm';
import { zodBody } from '../lib/validation';

const client = new OpenAI({
  apiKey: process.env.E_INFRA_API_TOKEN,
  baseURL: process.env.EINFRA_BASE_URL ?? 'https://llm.ai.e-infra.cz/v1/',
});
const MODEL = process.env.EINFRA_MODEL ?? 'qwen3.5';

const rateLimitMap = new Map<number, { count: number; resetAt: number }>();
function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

const ChatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
});

export const aiRoutes = new Elysia({ prefix: '/ai' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })

  // POST /ai/brief
  .post('/brief', async ({ user, set }) => {
    const authUser = user as AuthUser;
    if (!checkRateLimit(authUser.id)) {
      set.status = 429;
      return { error: 'RATE_LIMITED', message: 'Max 10 AI requests per minute' };
    }

    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const userTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, authUser.id), isNull(tasks.deletedAt), lte(tasks.dueDate, weekFromNow)));

    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const userEvents = await db
      .select()
      .from(events)
      .where(and(eq(events.userId, authUser.id), isNull(events.deletedAt)));

    const context = JSON.stringify({ tasks: userTasks, events: userEvents });

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Si študentský asistent. Dostaneš JSON so zoznamom úloh a eventov študenta.
Vygeneruj krátky denný brief (2-3 vety, slovenčina) a identifikuj top 3 priority.
Pre každú prioritu urč urgency: high = deadline do 1 dňa, medium = do 3 dní, low = neskôr.
Odpoveď vráť VÝLUČNE ako JSON bez textu navyše:
{"brief":"...","priorities":[{"title":"...","dueDate":"...","urgency":"high"}]}`,
        },
        { role: 'user', content: context },
      ],
    });

    const raw = completion.choices[0].message.content ?? '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { brief: raw, priorities: [] };

    await logAction(db, authUser.id, 'Generated AI daily brief');
    return parsed;
  })

  // POST /ai/chat
  .post('/chat', async ({ body, user, set }) => {
    const authUser = user as AuthUser;
    if (!checkRateLimit(authUser.id)) {
      set.status = 429;
      return { error: 'RATE_LIMITED', message: 'Max 10 AI requests per minute' };
    }

    const userTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, authUser.id), isNull(tasks.deletedAt)));

    const enrolledCourses = await db
      .select({ id: courses.id, name: courses.name, code: courses.code })
      .from(courses)
      .innerJoin(userCourses, eq(userCourses.courseId, courses.id))
      .where(and(eq(userCourses.userId, authUser.id), isNull(courses.deletedAt)));

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Si študentský AI asistent. Kontext študenta: tasks=${JSON.stringify(userTasks)}, courses=${JSON.stringify(enrolledCourses)}.
Odpovedaj v jazyku, v ktorom sa ťa pýtajú (SK alebo EN). Buď stručný a konkrétny.`,
        },
        ...body.messages,
      ],
    });

    await logAction(db, authUser.id, 'AI chat message');
    return { reply: completion.choices[0].message.content ?? '' };
  }, zodBody(ChatSchema))

  // POST /ai/notes/:id/quiz
  .post('/notes/:id/quiz', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    if (!checkRateLimit(authUser.id)) {
      set.status = 429;
      return { error: 'RATE_LIMITED', message: 'Max 10 AI requests per minute' };
    }

    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, Number(params.id)), eq(notes.userId, authUser.id), isNull(notes.deletedAt)));

    if (!note) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Note not found or access denied' };
    }

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Si skúšajúci učiteľ. Dostaneš text poznámky. Vytvor presne 5 multiple-choice otázok.
Každá otázka má 4 možnosti (pole strings). Správna odpoveď je na indexe correct (0-3).
Odpoveď VÝLUČNE ako JSON bez textu navyše:
{"questions":[{"question":"...","options":["A","B","C","D"],"correct":0}]}
Otázky musia byť v jazyku poznámky.`,
        },
        { role: 'user', content: note.description ?? note.title },
      ],
    });

    const raw = completion.choices[0].message.content ?? '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [] };

    await logAction(db, authUser.id, `Generated quiz for note ${note.id}`);
    return parsed;
  })

  // POST /ai/notes/:id/chat
  .post('/notes/:id/chat', async ({ params, body, user, set }) => {
    const authUser = user as AuthUser;
    if (!checkRateLimit(authUser.id)) {
      set.status = 429;
      return { error: 'RATE_LIMITED', message: 'Max 10 AI requests per minute' };
    }

    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, Number(params.id)), eq(notes.userId, authUser.id), isNull(notes.deletedAt)));

    if (!note) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Note not found or access denied' };
    }

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Si asistent pre štúdium. Odpovedaj IBA na základe nasledujúcej poznámky.
Ak odpoveď v poznámke nie je, úprimne to povedz.
Jazyk odpovede = jazyk otázky.

POZNÁMKA:
${note.description ?? note.title}`,
        },
        ...body.messages,
      ],
    });

    await logAction(db, authUser.id, `AI note chat for note ${note.id}`);
    return { reply: completion.choices[0].message.content ?? '' };
  }, zodBody(ChatSchema));