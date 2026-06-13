# Teacher Agent + Materials Read Access — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the AI agent so teachers can assign tasks to groups/students via chat, and both roles can browse study materials.

**Architecture:** Single `POST /ai/agent` endpoint auto-detects role from JWT. Tool manifest splits into STUDENT_TOOLS / TEACHER_TOOLS; `getToolsForRole()` selects the right set. Two system prompts (student vs teacher). New `POST /tasks/assign` endpoint for per-student task creation.

**Tech Stack:** ElysiaJS + Bun + Drizzle ORM + OpenAI SDK (E-infra qwen3.5). TypeScript strict.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `apps/backend/src/ai/tools.ts` | Modify | Split into STUDENT_TOOLS/TEACHER_TOOLS, add 6 new tools, add `getToolsForRole()` |
| `apps/backend/src/ai/executor.ts` | Modify | Add 6 new switch cases |
| `apps/backend/src/routes/tasks.ts` | Modify | Add `POST /tasks/assign` endpoint |
| `apps/backend/src/routes/ai.ts` | Modify | Two system prompts, use `getToolsForRole()` |

---

## Task 1: Extend tool manifest (`tools.ts`)

**Files:**
- Modify: `apps/backend/src/ai/tools.ts`

### What to do

Replace the current file content with the version below. Key changes:
- `STUDENT_TOOLS` = all existing tools + new `list_course_materials`
- `TEACHER_TOOLS` = `STUDENT_TOOLS` + 5 teacher-only tools
- `getToolsForRole(roles)` picks the right array
- `TOOL_MUTATES` extended with all new tools

- [ ] **Otvor** `apps/backend/src/ai/tools.ts` a **nahraď celý obsah** týmto:

```typescript
import type OpenAI from 'openai';

const STUDENT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  // --- Tasks ---
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description:
        "List the current user's tasks (title, status, dueDate, priority). Use to answer questions about what the user has to do.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description:
        'Create a new task for the current user. Use when the user asks to add/create a task or reminder.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short task title' },
          description: { type: 'string', description: 'Optional longer details' },
          dueDate: { type: 'string', description: 'Due date in ISO format, e.g. 2026-06-15. Default: today' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Default: LOW' },
          courseId: { type: 'number', description: 'Optional course ID to link this task to a course. Use list_courses first to find the ID.' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Update an existing task. Use when the user wants to change a task title, due date, priority, or description.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Task ID to update' },
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New description' },
          dueDate: { type: 'string', description: 'New due date in ISO format' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          courseId: { type: 'number', description: 'Link task to a course by course ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Toggle a task as done or not done.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Task ID to toggle' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Delete a task permanently.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Task ID to delete' },
        },
        required: ['id'],
      },
    },
  },

  // --- Notes ---
  {
    type: 'function',
    function: {
      name: 'list_notes',
      description: "List the current user's notes (title, folderId). Use to find notes or answer questions about them.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_note',
      description: 'Get the full content of a specific note by ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Note ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_note',
      description: 'Create a new note for the current user.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Note title' },
          description: { type: 'string', description: 'Note content (markdown supported)' },
          folderId: { type: 'number', description: 'Optional folder ID to put the note in' },
          courseId: { type: 'number', description: 'Optional course ID to link this note to a course.' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_note',
      description: 'Update the title or content of an existing note.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Note ID to update' },
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New content' },
          courseId: { type: 'number', description: 'Link note to a course by course ID' },
        },
        required: ['id'],
      },
    },
  },

  // --- Events ---
  {
    type: 'function',
    function: {
      name: 'list_events',
      description: "List the current user's calendar events and deadlines.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: 'Create a new calendar event or deadline.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          startDate: { type: 'string', description: 'Start date-time in ISO format' },
          endDate: { type: 'string', description: 'End date-time in ISO format' },
          description: { type: 'string', description: 'Optional details' },
        },
        required: ['title', 'startDate', 'endDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_event',
      description: 'Delete a calendar event.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Event ID to delete' },
        },
        required: ['id'],
      },
    },
  },

  // --- Courses ---
  {
    type: 'function',
    function: {
      name: 'list_courses',
      description: 'List the courses the current user is enrolled in.',
      parameters: { type: 'object', properties: {} },
    },
  },

  // --- Materials (read-only, both roles) ---
  {
    type: 'function',
    function: {
      name: 'list_course_materials',
      description: 'List study materials for a specific course. Use list_courses first to find the courseId.',
      parameters: {
        type: 'object',
        properties: {
          courseId: { type: 'number', description: 'Course ID' },
        },
        required: ['courseId'],
      },
    },
  },

  // --- Search ---
  {
    type: 'function',
    function: {
      name: 'search',
      description: 'Search across all user data — tasks, notes, events, and courses — by keyword.',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
        },
        required: ['q'],
      },
    },
  },
];

const TEACHER_ONLY_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_groups',
      description: 'List all groups the current teacher manages.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_group_members',
      description: 'List members of a specific group by groupId.',
      parameters: {
        type: 'object',
        properties: {
          groupId: { type: 'number', description: 'Group ID' },
        },
        required: ['groupId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_students',
      description: 'Search for students by name or email. Returns a list of matching users.',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Name or email fragment to search for' },
        },
        required: ['q'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_assignment',
      description:
        'Create an assignment for a group. This creates one task for every member of the group. Use list_groups and list_group_members first to find the right groupId.',
      parameters: {
        type: 'object',
        properties: {
          groupId: { type: 'number', description: 'Group ID' },
          title: { type: 'string', description: 'Assignment title' },
          dueDate: { type: 'string', description: 'Due date in ISO format, e.g. 2026-07-01' },
          description: { type: 'string', description: 'Optional assignment description' },
        },
        required: ['groupId', 'title', 'dueDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_task_to_student',
      description:
        'Assign a task directly to a single student. Use list_students first to find the studentId.',
      parameters: {
        type: 'object',
        properties: {
          studentId: { type: 'number', description: 'Student user ID' },
          title: { type: 'string', description: 'Task title' },
          dueDate: { type: 'string', description: 'Due date in ISO format' },
          description: { type: 'string', description: 'Optional details' },
          courseId: { type: 'number', description: 'Optional course ID to link the task to' },
        },
        required: ['studentId', 'title'],
      },
    },
  },
];

export const TEACHER_TOOLS = [...STUDENT_TOOLS, ...TEACHER_ONLY_TOOLS];

export function getToolsForRole(
  roles: string[]
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return roles.includes('TEACHER') ? TEACHER_TOOLS : STUDENT_TOOLS;
}

export const TOOL_MUTATES: Record<string, boolean> = {
  // Student tools
  list_tasks: false,
  create_task: true,
  update_task: true,
  complete_task: true,
  delete_task: true,
  list_notes: false,
  get_note: false,
  create_note: true,
  update_note: true,
  list_events: false,
  create_event: true,
  delete_event: true,
  list_courses: false,
  list_course_materials: false,
  search: false,
  // Teacher tools
  list_groups: false,
  list_group_members: false,
  list_students: false,
  create_assignment: true,
  assign_task_to_student: true,
};
```

- [ ] **Skontroluj** že súbor sa uložil bez chýb — otvor terminál a spusti:
```bash
cd apps/backend && bun build src/ai/tools.ts --target=bun 2>&1 | head -5
```
Očakávaný výstup: žiadne errory (môže vypísať cestu k výstupu).

- [ ] **Commitni:**
```bash
git add apps/backend/src/ai/tools.ts
git commit -m "feat: split agent tools into student/teacher sets, add getToolsForRole"
```

---

## Task 2: Add `POST /tasks/assign` endpoint (`tasks.ts`)

**Files:**
- Modify: `apps/backend/src/routes/tasks.ts`

Pridaj nový Zod schema a endpoint na koniec Elysia chainu (pred posledný `;`).

- [ ] **Pridaj** tento import na začiatok `tasks.ts` (ak tam ešte nie je `users`):
```typescript
import { users } from '../db/schema';
```
*(Skontroluj riadok 4 — ak tam `users` nie je, pridaj ho do importu z `'../db/schema'`.)*

- [ ] **Pridaj** nový schema objekt za existujúci `UpdateTaskSchema` (pred `export const tasksRoutes`):
```typescript
const AssignTaskSchema = z.object({
  studentId: z.number().int().positive(),
  title: z.string().min(1),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  courseId: z.number().optional(),
});
```

- [ ] **Pridaj** nový endpoint na koniec Elysia chainu v `tasksRoutes` — tesne pred posledný `;`:
```typescript
  .post(
    '/assign',
    async ({ body, user, set }) => {
      const authUser = user as AuthUser;
      if (!authUser.roles.includes('TEACHER')) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Only teachers can assign tasks to students' };
      }
      const [student] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, body.studentId));
      if (!student) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Student not found' };
      }
      const [task] = await db
        .insert(tasks)
        .values({
          userId: body.studentId,
          title: body.title,
          ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
          description: body.description,
          courseId: body.courseId,
        })
        .returning();
      await logAction(
        db,
        authUser.id,
        `Teacher assigned task ${task.id} to student ${body.studentId}`
      );
      return task;
    },
    zodBody(AssignTaskSchema)
  )
```

- [ ] **Skontroluj** že importy sú kompletné:
```bash
cd apps/backend && bun build src/routes/tasks.ts --target=bun 2>&1 | head -10
```
Očakávaný výstup: žiadne errory.

- [ ] **Commitni:**
```bash
git add apps/backend/src/routes/tasks.ts
git commit -m "feat: add POST /tasks/assign for teacher-to-student task assignment"
```

---

## Task 3: Extend executor (`executor.ts`)

**Files:**
- Modify: `apps/backend/src/ai/executor.ts`

- [ ] **Pridaj** 6 nových cases do switchu v `executeTool` — tesne pred `default:`:

```typescript
    // --- Materials ---
    case 'list_course_materials':
      return callApi('GET', `/courses/${args.courseId}/materials`, authHeader);

    // --- Teacher: Groups ---
    case 'list_groups':
      return callApi('GET', '/groups', authHeader);
    case 'list_group_members':
      return callApi('GET', `/groups/${args.groupId}`, authHeader);

    // --- Teacher: Students ---
    case 'list_students':
      return callApi('GET', `/users/search?q=${encodeURIComponent(String(args.q))}`, authHeader);

    // --- Teacher: Assignments ---
    case 'create_assignment': {
      const { groupId, ...rest } = args;
      return callApi('POST', `/groups/${groupId}/assignments`, authHeader, rest);
    }
    case 'assign_task_to_student':
      return callApi('POST', '/tasks/assign', authHeader, args);
```

- [ ] **Skontroluj:**
```bash
cd apps/backend && bun build src/ai/executor.ts --target=bun 2>&1 | head -10
```
Očakávaný výstup: žiadne errory.

- [ ] **Commitni:**
```bash
git add apps/backend/src/ai/executor.ts
git commit -m "feat: add executor cases for materials, groups, students, teacher assignments"
```

---

## Task 4: Two system prompts + role-aware tools (`ai.ts`)

**Files:**
- Modify: `apps/backend/src/routes/ai.ts`

- [ ] **Uprav import** na riadku 10 — zmeň:
```typescript
import { AGENT_TOOLS, TOOL_MUTATES } from '../ai/tools';
```
na:
```typescript
import { getToolsForRole, TOOL_MUTATES } from '../ai/tools';
```

- [ ] **Nájdi** v `POST /ai/agent` handler tieto riadky (sú na začiatku handlera):
```typescript
    const authHeader = request.headers.get('authorization') ?? '';
    const lang = body.lang ?? 'sk';
    const langLabel = lang === 'en' ? 'English' : 'Slovak';
    const today = new Date().toISOString().split('T')[0];

    // Build message list for the model.
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a student AI assistant. Today is ${today}.
You have tools to read and manage the student's data. Use them to answer questions and take actions.
When you use a tool and get a result, summarize it clearly in ${langLabel}.
Be concise. Never expose raw JSON to the user.`,
      },
      ...body.messages,
    ];
```

**Nahraď ich** týmto blokom:
```typescript
    const authHeader = request.headers.get('authorization') ?? '';
    const lang = body.lang ?? 'sk';
    const langLabel = lang === 'en' ? 'English' : 'Slovak';
    const today = new Date().toISOString().split('T')[0];
    const isTeacher = authUser.roles.includes('TEACHER');

    const systemPrompt = isTeacher
      ? `You are an AI assistant for a university teacher. Today is ${today}.
You can: assign tasks to groups (create_assignment) or individual students (assign_task_to_student), list groups and their members, search students by name or email, and browse study materials for courses.
When assigning to a student, use list_students first to find their ID. When assigning to a group, use list_groups and list_group_members first.
Never share one student's data with another. Be concise. Never expose raw JSON. Respond in ${langLabel}.`
      : `You are an AI assistant for a student. Today is ${today}.
You have tools to read and manage your tasks, notes, events, courses, and study materials. Use them to answer questions and take actions.
When you use a tool and get a result, summarize it clearly in ${langLabel}.
Be concise. Never expose raw JSON.`;

    // Build message list for the model.
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...body.messages,
    ];
```

- [ ] **Nájdi** v agent loope volanie modelu:
```typescript
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: AGENT_TOOLS,
      });
```
**Zmeň** `tools: AGENT_TOOLS` na:
```typescript
        tools: getToolsForRole(authUser.roles),
```

- [ ] **Skontroluj:**
```bash
cd apps/backend && bun build src/routes/ai.ts --target=bun 2>&1 | head -10
```
Očakávaný výstup: žiadne errory.

- [ ] **Spusti backend** a manuálne otestuj:
```bash
cd apps/backend && bun run dev
```
V AI Copilot paneli (Agent tab) ako študent: napíš "zoznam mojich úloh" — mal by odpovedať bez teacher nástrojov.

- [ ] **Commitni:**
```bash
git add apps/backend/src/routes/ai.ts
git commit -m "feat: role-aware system prompt and tool selection in AI agent"
git push
```

---

## Overenie

Po dokončení všetkých taskov:

1. **Ako študent** — v Agent tabe: "aké materiály má kurz PB138?" → agent zavolá `list_courses` + `list_course_materials`, odpovie.
2. **Ako učiteľ** — v Agent tabe: "pridaj zadanie skupinke Seminár A na budúci týždeň" → agent zavolá `list_groups`, nájde skupinu, confirm card pre `create_assignment`, po potvrdení vytvorí tasky.
3. **Ako učiteľ** — "zadaj úlohu Jánovi Novákovi" → agent zavolá `list_students`, confirm pre `assign_task_to_student`.
4. **Ako študent** — nemôže zavolať `list_groups` ani `create_assignment` (model ich nevidí).
