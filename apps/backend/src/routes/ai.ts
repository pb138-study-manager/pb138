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

const BriefSchema = z.object({
  lang: z.string().optional(),
});

const ChatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
  lang: z.string().optional(),
});

const QuizLangSchema = z.object({
  lang: z.string().optional(),
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
  .post('/brief', async ({ body, user, set }) => {
    const authUser = user as AuthUser;
    if (!checkRateLimit(authUser.id)) {
      set.status = 429;
      return { error: 'RATE_LIMITED', message: 'Max 10 AI requests per minute' };
    }

    const lang = body.lang ?? 'sk';
    const langLabel = lang === 'en' ? 'English' : 'Slovak';

    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const userTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, authUser.id), isNull(tasks.deletedAt), lte(tasks.dueDate, weekFromNow)));

    const userEvents = await db
      .select()
      .from(events)
      .where(and(eq(events.userId, authUser.id), isNull(events.deletedAt)));

    const today = new Date().toISOString().split('T')[0];
    const context = JSON.stringify({ today, tasks: userTasks, events: userEvents });

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a student assistant. You will receive a JSON with today's date, the student's tasks and events.
Today is ${today}. Tasks with dueDate before today are overdue.
Generate a short daily brief (2-3 sentences) and identify the top 3 priorities.
For each priority determine urgency: high = overdue or deadline within 1 day, medium = within 3 days, low = later.
Respond in ${langLabel}.
Return ONLY as JSON with no extra text:
{"brief":"...","priorities":[{"title":"...","dueDate":"...","urgency":"high"}]}`,
        },
        { role: 'user', content: context },
      ],
    });

    const raw = completion.choices[0].message.content ?? '{}';
    const jsonMatch = raw.match(/\{[\s\S]*}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { brief: raw, priorities: [] };

    await logAction(db, authUser.id, 'Generated AI daily brief');
    return parsed;
  }, zodBody(BriefSchema))

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

    const today = new Date().toISOString().split('T')[0];
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a student AI assistant. Today is ${today}. Tasks with dueDate before today are overdue.
Student context: tasks=${JSON.stringify(userTasks)}, courses=${JSON.stringify(enrolledCourses)}.
Respond in the language the user writes in (Slovak or English). Be concise and specific.`,
        },
        ...body.messages,
      ],
    });

    await logAction(db, authUser.id, 'AI chat message');
    return { reply: completion.choices[0].message.content ?? '' };
  }, zodBody(ChatSchema))

  // POST /ai/notes/:id/quiz
  .post('/notes/:id/quiz', async ({ params, body, user, set }) => {
    const authUser = user as AuthUser;
    if (!checkRateLimit(authUser.id)) {
      set.status = 429;
      return { error: 'RATE_LIMITED', message: 'Max 10 AI requests per minute' };
    }

    const lang = body.lang ?? 'sk';
    const langLabel = lang === 'en' ? 'English' : 'Slovak';

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
          content: `You are an examiner. You will receive note text. Create exactly 5 multiple-choice questions.
Each question has 4 options (array of strings). The correct answer is at index correct (0-3).
Questions must be in ${langLabel}.
Return ONLY as JSON with no extra text:
{"questions":[{"question":"...","options":["A","B","C","D"],"correct":0}]}`,
        },
        { role: 'user', content: note.description ?? note.title },
      ],
    });

    const raw = completion.choices[0].message.content ?? '{}';
    const jsonMatch = raw.match(/\{[\s\S]*}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [] };

    await logAction(db, authUser.id, `Generated quiz for note ${note.id}`);
    return parsed;
  }, zodBody(QuizLangSchema))

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