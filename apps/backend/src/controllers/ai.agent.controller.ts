import { db } from '../db';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { RateLimitError } from '../lib/errors';
import { getToolsForRole, TOOL_MUTATES } from '../ai/tools';
import { executeTool } from '../ai/executor';
import { client, MODEL, checkRateLimit } from './ai.controller';
import type OpenAI from 'openai';
import type { AgentInput } from '../routes/ai';

const LIST_DISPLAY_TOOLS: Record<string, 'tasks' | 'events' | 'notes' | 'courses'> = {
  list_tasks: 'tasks',
  list_events: 'events',
  list_notes: 'notes',
  list_courses: 'courses',
};

function formatActionLabel(toolName: string, args: Record<string, unknown>): string {
  const name = (args.title ?? args.name ?? args.text ?? '') as string;
  const actionMap: Record<string, string> = {
    create_task: `Vytvoriť úlohu${name ? ` "${name}"` : ''}`,
    update_task: `Aktualizovať úlohu${name ? ` "${name}"` : ''}`,
    delete_task: 'Zmazať úlohu',
    create_event: `Vytvoriť udalosť${name ? ` "${name}"` : ''}`,
    update_event: `Aktualizovať udalosť${name ? ` "${name}"` : ''}`,
    delete_event: 'Zmazať udalosť',
    create_note: `Vytvoriť poznámku${name ? ` "${name}"` : ''}`,
    update_note: `Aktualizovať poznámku${name ? ` "${name}"` : ''}`,
    delete_note: 'Zmazať poznámku',
  };
  return actionMap[toolName] ?? `Vykonať: ${toolName.replace(/_/g, ' ')}${name ? ` "${name}"` : ''}`;
}

function buildSystemPrompt(user: AuthUser, lang: string): string {
  const langLabel = lang === 'en' ? 'English' : 'Slovak';
  const today = new Date().toISOString().split('T')[0];

  if (user.roles.includes('TEACHER')) {
    return `You are an AI assistant for a university teacher. Today is ${today}.
You can: assign tasks to groups (create_assignment) or individual students (assign_task_to_student), list groups and their members, search students by name or email, and browse study materials for courses.
When assigning to a student, ALWAYS call list_students first. If multiple students match, do NOT guess — show the user their name and login (login is unique) and ask which one to assign to. Wait for clarification before calling assign_task_to_student.
When assigning to a group, use list_groups and list_group_members first.
Never share one student's data with another. Be concise. Never expose raw JSON. Respond in ${langLabel}.`;
  }

  return `You are an AI assistant for a student. Today is ${today}.
You have tools to read and manage tasks, notes, events, courses, and study materials.
KEY DISTINCTION: "deadlines" (termíny) are calendar EVENTS with type=DEADLINE — stored separately from tasks. Always use list_events for deadline questions, never list_tasks.
STRICT RULES:
1. Be SHORT. Answer in the fewest words possible. Never over-explain or add unsolicited context.
2. Call ONLY the tool needed for the user's exact question. Do NOT call extra tools unprompted.
3. After calling any list tool, reply with ONE SHORT SENTENCE only. The UI renders items as cards — NEVER output tables, lists, or enumerations.
4. If nothing is found, say so in one sentence. Do not suggest alternatives or add commentary.
Respond in ${langLabel}. Never expose raw JSON.`;
}

export async function agent(user: AuthUser, body: AgentInput, authHeader: string) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();

  const lang = body.lang ?? 'sk';
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(user, lang) },
    ...body.messages,
  ];

  if (body.confirm) {
    const confirmResult = await executeTool(body.confirm.name, body.confirm.args as Record<string, unknown>, authHeader);
    await logAction(db, user.id, `AI agent executed tool: ${body.confirm.name}`);
    messages.push({ role: 'assistant' as const, content: null, tool_calls: [{ id: 'confirmed', type: 'function' as const, function: { name: body.confirm.name, arguments: JSON.stringify(body.confirm.args) } }] });
    messages.push({ role: 'tool' as const, tool_call_id: 'confirmed', content: JSON.stringify(confirmResult) });
  }

  let lastDisplay: { type: 'tasks' | 'events' | 'notes' | 'courses'; items: unknown[] } | undefined;
  let listToolCalled = false;

  for (let i = 0; i < 6; i++) {
    const completion = await client.chat.completions.create({ model: MODEL, messages, tools: getToolsForRole(user.roles) });
    const choice = completion.choices[0];
    const msg = choice.message;

    if (choice.finish_reason === 'stop' || !msg.tool_calls?.length) {
      await logAction(db, user.id, 'AI agent chat');
      const rawReply = msg.content ?? '';
      const stripped = rawReply.split('\n').filter((line) => !line.match(/^\s*\|/)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
      const reply = listToolCalled ? (stripped.split('\n').find((l) => l.trim()) ?? stripped) : stripped;
      return { reply, display: lastDisplay };
    }

    const toolCall = msg.tool_calls[0];
    const toolName = toolCall.function.name;
    const toolArgs = JSON.parse(toolCall.function.arguments ?? '{}');

    if (TOOL_MUTATES[toolName]) {
      await logAction(db, user.id, `AI agent pending action: ${toolName}`);
      return { pendingAction: { name: toolName, args: toolArgs, label: formatActionLabel(toolName, toolArgs) } };
    }

    const result = await executeTool(toolName, toolArgs, authHeader);
    await logAction(db, user.id, `AI agent tool: ${toolName}`);

    if (LIST_DISPLAY_TOOLS[toolName]) listToolCalled = true;
    if (LIST_DISPLAY_TOOLS[toolName] && !lastDisplay) {
      const now = new Date();
      let items = Array.isArray(result) ? result : [];
      if (toolName === 'list_tasks') items = items.filter((t: unknown) => (t as Record<string, unknown>).status !== 'DONE');
      if (toolName === 'list_events') items = items.filter((e: unknown) => { const start = (e as Record<string, unknown>).startDate; return start && new Date(String(start)) >= now; });
      if (items.length > 0) lastDisplay = { type: LIST_DISPLAY_TOOLS[toolName], items };
    }

    messages.push({ role: 'assistant', content: null, tool_calls: msg.tool_calls });
    messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
  }

  return { reply: 'Nepodarilo sa dokončiť požiadavku.', display: lastDisplay };
}
