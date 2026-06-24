import OpenAI from 'openai';
import { db } from '../db';
import { tasks, events, courses, notes, userCourses } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, lte, gte } from 'drizzle-orm';
import { NotFoundError, RateLimitError } from '../lib/errors';
import type { BriefInput, ChatInput, QuizLangInput } from '../routes/ai';

export const client = new OpenAI({
  apiKey: process.env.E_INFRA_API_TOKEN,
  baseURL: process.env.EINFRA_BASE_URL ?? 'https://llm.ai.e-infra.cz/v1/',
});
export const MODEL = process.env.EINFRA_MODEL ?? 'qwen3.5';

const rateLimitMap = new Map<number, { count: number; resetAt: number }>();
export function checkRateLimit(userId: number): boolean {
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

export async function brief(user: AuthUser, body: BriefInput) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();
  const lang = body.lang ?? 'sk';
  const langLabel = lang === 'en' ? 'English' : 'Slovak';
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const userTasks = await db.select().from(tasks).where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt), lte(tasks.dueDate, weekFromNow)));
  const userEvents = await db.select().from(events).where(and(eq(events.userId, user.id), isNull(events.deletedAt)));
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
  await logAction(db, user.id, 'Generated AI daily brief');
  return parsed;
}

export async function chat(user: AuthUser, body: ChatInput) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();

  const userTasks = await db.select().from(tasks).where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt)));
  const enrolledCourses = await db
    .select({ id: courses.id, name: courses.name, code: courses.code })
    .from(courses)
    .innerJoin(userCourses, eq(userCourses.courseId, courses.id))
    .where(and(eq(userCourses.userId, user.id), isNull(courses.deletedAt)));

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

  await logAction(db, user.id, 'AI chat message');
  return { reply: completion.choices[0].message.content ?? '' };
}

export async function quiz(user: AuthUser, noteId: number, body: QuizLangInput) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();
  const lang = body.lang ?? 'sk';
  const langLabel = lang === 'en' ? 'English' : 'Slovak';

  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id), isNull(notes.deletedAt)));
  if (!note) throw new NotFoundError('Note not found or access denied');

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
  await logAction(db, user.id, `Generated quiz for note ${note.id}`);
  return parsed;
}

export async function noteChat(user: AuthUser, noteId: number, body: ChatInput) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();

  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id), isNull(notes.deletedAt)));
  if (!note) throw new NotFoundError('Note not found or access denied');

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

  await logAction(db, user.id, `AI note chat for note ${note.id}`);
  return { reply: completion.choices[0].message.content ?? '' };
}

export async function daySummary(user: AuthUser, lang: string) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();
  const langLabel = lang === 'en' ? 'English' : 'Slovak';
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const today = now.toISOString().split('T')[0];

  const dueTasks = await db.select().from(tasks).where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt), lte(tasks.dueDate, dayEnd)));
  const dayEvents = await db.select().from(events).where(and(eq(events.userId, user.id), isNull(events.deletedAt), gte(events.startDate, dayStart), lte(events.startDate, dayEnd)));
  const context = JSON.stringify({ today, tasks: dueTasks, events: dayEvents });

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a student assistant. You receive a JSON with today's date, the student's tasks due today or earlier, and today's events.
Today is ${today}. Tasks with dueDate before today are overdue.
Write a concise, encouraging summary of the student's day: what is due today, what is overdue, which events are scheduled, and what the student should prioritize first.
Use short Markdown sections with headings and bullet points. Keep it under ~150 words. Respond in ${langLabel}.`,
      },
      { role: 'user', content: context },
    ],
  });

  await logAction(db, user.id, 'Generated AI day summary');
  return { summary: completion.choices[0].message.content ?? '' };
}

export async function timelineSummary(user: AuthUser, lang: string) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();
  const langLabel = lang === 'en' ? 'English' : 'Slovak';
  const today = new Date().toISOString().split('T')[0];

  const allTasks = await db.select().from(tasks).where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt)));
  const allEvents = await db.select().from(events).where(and(eq(events.userId, user.id), isNull(events.deletedAt)));
  const deadlines = allTasks.filter((t) => t.dueDate).map((t) => ({ title: t.title, dueDate: t.dueDate, status: t.status }));
  const context = JSON.stringify({ today, deadlines, events: allEvents });

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a student planning assistant. You receive a JSON with today's date, the student's task deadlines, and their events.
Today is ${today}.
Analyze the structure of the timeline. Describe the overall workload distribution, identify peak periods (clusters of deadlines/events on the same days or weeks), and point out notable gaps (free stretches with no commitments).
Give 1-2 short, actionable suggestions to balance the workload.
Use short Markdown sections with headings and bullet points. Keep it under ~180 words. Respond in ${langLabel}.`,
      },
      { role: 'user', content: context },
    ],
  });

  await logAction(db, user.id, 'Generated AI timeline summary');
  return { summary: completion.choices[0].message.content ?? '' };
}
