import { Elysia } from 'elysia';
import { z } from 'zod';
import OpenAI from 'openai';
import { db } from '../db';
import { tasks, events, courses, notes, userCourses } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, lte, gte } from 'drizzle-orm';
import { zodBody } from '../lib/validation';
import { getToolsForRole, TOOL_MUTATES } from '../ai/tools';
import { executeTool } from '../ai/executor';

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

const AgentSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
  confirm: z.object({ name: z.string(), args: z.record(z.unknown()) }).optional(),
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
  }, zodBody(ChatSchema))

  // POST /ai/agent
  .post('/agent', async ({ body, user, set, request }) => {
    const authUser = user as AuthUser;
    if (!checkRateLimit(authUser.id)) {
      set.status = 429;
      return { error: 'RATE_LIMITED', message: 'Max 10 AI requests per minute' };
    }

    const authHeader = request.headers.get('authorization') ?? '';
    const lang = body.lang ?? 'sk';
    const langLabel = lang === 'en' ? 'English' : 'Slovak';
    const today = new Date().toISOString().split('T')[0];
    const isTeacher = authUser.roles.includes('TEACHER');

    const systemPrompt = isTeacher
      ? `You are an AI assistant for a university teacher. Today is ${today}.
You can: assign tasks to groups (create_assignment) or individual students (assign_task_to_student), list groups and their members, search students by name or email, and browse study materials for courses.
When assigning to a student, ALWAYS call list_students first. If multiple students match, do NOT guess — show the user their name and login (login is unique) and ask which one to assign to. Wait for clarification before calling assign_task_to_student.
When assigning to a group, use list_groups and list_group_members first.
Never share one student's data with another. Be concise. Never expose raw JSON. Respond in ${langLabel}.`
      : `You are an AI assistant for a student. Today is ${today}.
You have tools to read and manage your tasks, notes, events, courses, and study materials. Use them to answer questions and take actions.
CRITICAL RULE: After calling a list tool (list_tasks, list_events, list_notes, list_courses), your text reply must be ONE SHORT SENTENCE only — for example "Našiel som 5 úloh." or "Tu sú vaše eventy." — NEVER output a table, bullet list, numbered list, or any enumeration of the items. The UI renders the items as cards automatically.
Respond in ${langLabel}. Never expose raw JSON.`;

    // Build message list for the model.
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...body.messages,
    ];

    // If user confirmed a pending write action, execute it and re-enter the loop.
    if (body.confirm) {
      const confirmResult = await executeTool(
        body.confirm.name,
        body.confirm.args as Record<string, unknown>,
        authHeader
      );
      await logAction(db, authUser.id, `AI agent executed tool: ${body.confirm.name}`);

      // Add the tool call + result to history so model knows what happened.
      messages.push({
        role: 'assistant' as const,
        content: null,
        tool_calls: [{
          id: 'confirmed',
          type: 'function' as const,
          function: { name: body.confirm.name, arguments: JSON.stringify(body.confirm.args) },
        }],
      });
      messages.push({
        role: 'tool' as const,
        tool_call_id: 'confirmed',
        content: JSON.stringify(confirmResult),
      });
      // Fall through to the loop — model can propose the next action.
    }

    const LIST_DISPLAY_TOOLS: Record<string, 'tasks' | 'events' | 'notes' | 'courses'> = {
      list_tasks: 'tasks',
      list_events: 'events',
      list_notes: 'notes',
      list_courses: 'courses',
    };
    let lastDisplay:
      | { type: 'tasks' | 'events' | 'notes' | 'courses'; items: unknown[] }
      | undefined;

    // Agent loop: max 6 iterations to prevent runaway chains.
    for (let i = 0; i < 6; i++) {
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: getToolsForRole(authUser.roles),
      });

      const choice = completion.choices[0];
      const msg = choice.message;

      // Model returned a text reply — we're done.
      if (choice.finish_reason === 'stop' || !msg.tool_calls?.length) {
        await logAction(db, authUser.id, 'AI agent chat');
        const rawReply = msg.content ?? '';
        // Strip markdown tables — agent chat is not a table-rendering context.
        const stripped = rawReply
          .split('\n')
          .filter((line) => !line.match(/^\s*\|/))
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        // When cards are shown, keep only the first non-empty line as caption.
        const reply = lastDisplay
          ? (stripped.split('\n').find((l) => l.trim()) ?? stripped)
          : stripped;
        return { reply, display: lastDisplay };
      }

      // Model wants to call a tool.
      const toolCall = msg.tool_calls[0];
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments ?? '{}');

      // Mutating tool → stop and ask the user to confirm.
      if (TOOL_MUTATES[toolName]) {
        await logAction(db, authUser.id, `AI agent pending action: ${toolName}`);
        return {
          pendingAction: {
            name: toolName,
            args: toolArgs,
            label: `Vykonať: ${toolName.replace(/_/g, ' ')} ${JSON.stringify(toolArgs)}`,
          },
        };
      }

      // Read-only tool → execute immediately, feed result back to model.
      const result = await executeTool(toolName, toolArgs, authHeader);
      await logAction(db, authUser.id, `AI agent tool: ${toolName}`);

      if (LIST_DISPLAY_TOOLS[toolName]) {
        let items = Array.isArray(result) ? result : [];
        if (toolName === 'list_tasks') {
          items = items.filter((t: unknown) => (t as Record<string, unknown>).status !== 'DONE');
        }
        if (items.length > 0) lastDisplay = { type: LIST_DISPLAY_TOOLS[toolName], items };
      }

      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: msg.tool_calls,
      });
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    return { reply: 'Nepodarilo sa dokončiť požiadavku.', display: lastDisplay };
  }, zodBody(AgentSchema))

  // GET /ai/day_summary
  .get('/day_summary', async ({ query, user, set }) => {
    const auth_user = user as AuthUser;
    if (!checkRateLimit(auth_user.id)) {
      set.status = 429;
      return { error: 'RATE_LIMITED', message: 'Max 10 AI requests per minute' };
    }

    const lang = (query.lang as string | undefined) ?? 'sk';
    const lang_label = lang === 'en' ? 'English' : 'Slovak';

    const now = new Date();
    const day_start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day_end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const today = now.toISOString().split('T')[0];

    const due_tasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, auth_user.id), isNull(tasks.deletedAt), lte(tasks.dueDate, day_end)));

    const day_events = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.userId, auth_user.id),
          isNull(events.deletedAt),
          gte(events.startDate, day_start),
          lte(events.startDate, day_end)
        )
      );

    const context = JSON.stringify({ today, tasks: due_tasks, events: day_events });

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a student assistant. You receive a JSON with today's date, the student's tasks due today or earlier, and today's events.
Today is ${today}. Tasks with dueDate before today are overdue.
Write a concise, encouraging summary of the student's day: what is due today, what is overdue, which events are scheduled, and what the student should prioritize first.
Use short Markdown sections with headings and bullet points. Keep it under ~150 words. Respond in ${lang_label}.`,
        },
        { role: 'user', content: context },
      ],
    });

    await logAction(db, auth_user.id, 'Generated AI day summary');
    return { summary: completion.choices[0].message.content ?? '' };
  })

  // GET /ai/timeline_summary
  .get('/timeline_summary', async ({ query, user, set }) => {
    const auth_user = user as AuthUser;
    if (!checkRateLimit(auth_user.id)) {
      set.status = 429;
      return { error: 'RATE_LIMITED', message: 'Max 10 AI requests per minute' };
    }

    const lang = (query.lang as string | undefined) ?? 'sk';
    const lang_label = lang === 'en' ? 'English' : 'Slovak';

    const today = new Date().toISOString().split('T')[0];

    const all_tasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, auth_user.id), isNull(tasks.deletedAt)));

    const all_events = await db
      .select()
      .from(events)
      .where(and(eq(events.userId, auth_user.id), isNull(events.deletedAt)));

    const deadlines = all_tasks
      .filter((t) => t.dueDate)
      .map((t) => ({ title: t.title, dueDate: t.dueDate, status: t.status }));

    const context = JSON.stringify({ today, deadlines, events: all_events });

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a student planning assistant. You receive a JSON with today's date, the student's task deadlines, and their events.
Today is ${today}.
Analyze the structure of the timeline. Describe the overall workload distribution, identify peak periods (clusters of deadlines/events on the same days or weeks), and point out notable gaps (free stretches with no commitments).
Give 1-2 short, actionable suggestions to balance the workload.
Use short Markdown sections with headings and bullet points. Keep it under ~180 words. Respond in ${lang_label}.`,
        },
        { role: 'user', content: context },
      ],
    });

    await logAction(db, auth_user.id, 'Generated AI timeline summary');
    return { summary: completion.choices[0].message.content ?? '' };
  });
