import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

const API_URL = (process.env.STUDENT_OS_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const TOKEN = process.env.STUDENT_OS_TOKEN ?? '';

if (!TOKEN) {
  process.stderr.write('STUDENT_OS_TOKEN is not set. Requests will be unauthorized.\n');
}

async function callApi(method: string, path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({ error: true, status: res.status }));
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    // --- Tasks ---
    case 'list_tasks': {
      const tasks = await callApi('GET', '/tasks');
      if (!Array.isArray(tasks)) return tasks;
      let result = tasks as Record<string, unknown>[];
      if (args.onlyWithDueDate) result = result.filter((t) => t.dueDate != null);
      if (args.dueDateOn)
        result = result.filter(
          (t) => t.dueDate && String(t.dueDate).startsWith(String(args.dueDateOn))
        );
      if (args.limit) {
        result = [...result].sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(String(a.dueDate)).getTime() - new Date(String(b.dueDate)).getTime();
        });
        result = result.slice(0, Number(args.limit));
      }
      return result;
    }
    case 'create_task': {
      const today = new Date().toISOString().split('T')[0];
      return callApi('POST', '/tasks', { dueDate: today, priority: 'LOW', ...args });
    }
    case 'update_task': {
      const { id, ...rest } = args;
      return callApi('PATCH', `/tasks/${id}`, rest);
    }
    case 'complete_task':
      return callApi('PATCH', `/tasks/${args.id}/toggle-done`);
    case 'delete_task':
      return callApi('DELETE', `/tasks/${args.id}`);

    // --- Notes ---
    case 'list_notes':
      return callApi('GET', '/notes');
    case 'get_note':
      return callApi('GET', `/notes/${args.id}`);
    case 'create_note':
      return callApi('POST', '/notes', args);
    case 'update_note': {
      const { id, ...rest } = args;
      return callApi('PATCH', `/notes/${id}`, rest);
    }

    // --- Events ---
    case 'list_events': {
      const events = await callApi('GET', '/events');
      if (!Array.isArray(events) || !args.limit) return events;
      const now = new Date();
      const upcoming = events.filter(
        (e) => new Date(String((e as Record<string, unknown>).startDate)) >= now
      );
      const sorted = [...upcoming].sort(
        (a, b) =>
          new Date(String((a as Record<string, unknown>).startDate)).getTime() -
          new Date(String((b as Record<string, unknown>).startDate)).getTime()
      );
      return sorted.slice(0, Number(args.limit));
    }
    case 'create_event':
      return callApi('POST', '/events', args);
    case 'delete_event':
      return callApi('DELETE', `/events/${args.id}`);

    // --- Courses ---
    case 'list_courses':
      return callApi('GET', '/courses');

    // --- Materials ---
    case 'list_course_materials':
      return callApi('GET', `/courses/${args.courseId}/materials`);
    case 'read_material_content':
      return callApi('GET', `/courses/${args.courseId}/materials/${args.materialId}/content`);

    // --- Search ---
    case 'search':
      return callApi('GET', `/search?q=${encodeURIComponent(String(args.q))}`);

    // --- Teacher: Groups ---
    case 'list_groups':
      return callApi('GET', '/groups');
    case 'list_group_members':
      return callApi('GET', `/groups/${args.groupId}`);

    // --- Teacher: Students ---
    case 'list_students':
      return callApi('GET', `/users/search?q=${encodeURIComponent(String(args.q))}`);

    // --- Teacher: Assignments ---
    case 'create_assignment': {
      const { groupId, ...rest } = args;
      return callApi('POST', `/groups/${groupId}/assignments`, rest);
    }
    case 'assign_task_to_student':
      return callApi('POST', '/tasks/assign', args);

    default:
      return { error: true, message: `Unknown tool: ${name}` };
  }
}

const TOOLS: Tool[] = [
  // --- Tasks ---
  {
    name: 'list_tasks',
    description:
      "List the current user's incomplete to-do tasks (title, dueDate, priority). Use ONLY for questions about tasks or to-do items.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of tasks to return.' },
        onlyWithDueDate: {
          type: 'boolean',
          description: 'If true, exclude tasks without a due date.',
        },
        dueDateOn: {
          type: 'string',
          description: 'Filter tasks due on this specific date (YYYY-MM-DD).',
        },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task for the current user.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short task title' },
        description: { type: 'string', description: 'Optional longer details' },
        dueDate: {
          type: 'string',
          description: 'Due date in ISO format, e.g. 2026-06-15. Default: today',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH'],
          description: 'Default: LOW',
        },
        courseId: { type: 'number', description: 'Optional course ID to link to.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task (title, due date, priority, or description).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Task ID to update' },
        title: { type: 'string' },
        description: { type: 'string' },
        dueDate: { type: 'string', description: 'New due date in ISO format' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        courseId: { type: 'number' },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_task',
    description: 'Toggle a task as done or not done.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Task ID to toggle' } },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Task ID to delete' } },
      required: ['id'],
    },
  },

  // --- Notes ---
  {
    name: 'list_notes',
    description: "List the current user's notes (title, folderId).",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_note',
    description: 'Get the full content of a specific note by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Note ID' } },
      required: ['id'],
    },
  },
  {
    name: 'create_note',
    description: 'Create a new note.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string', description: 'Note content (markdown supported)' },
        folderId: { type: 'number' },
        courseId: { type: 'number' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_note',
    description: 'Update the title or content of an existing note.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        courseId: { type: 'number' },
      },
      required: ['id'],
    },
  },

  // --- Events ---
  {
    name: 'list_events',
    description:
      "List the current user's calendar events and deadlines. Pass limit: 1 for the next upcoming deadline.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Return only the N nearest upcoming events.' },
      },
    },
  },
  {
    name: 'create_event',
    description: 'Create a new calendar event or deadline.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        startDate: { type: 'string', description: 'ISO date-time' },
        endDate: { type: 'string', description: 'ISO date-time' },
        description: { type: 'string' },
      },
      required: ['title', 'startDate', 'endDate'],
    },
  },
  {
    name: 'delete_event',
    description: 'Delete a calendar event.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },

  // --- Courses ---
  {
    name: 'list_courses',
    description: 'List the courses the current user is enrolled in.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_course_materials',
    description: 'List study materials for a specific course.',
    inputSchema: {
      type: 'object',
      properties: { courseId: { type: 'number' } },
      required: ['courseId'],
    },
  },
  {
    name: 'read_material_content',
    description:
      'Read the text content of a study material (PDF or webpage). Returns up to 8000 characters.',
    inputSchema: {
      type: 'object',
      properties: {
        courseId: { type: 'number' },
        materialId: { type: 'number' },
      },
      required: ['courseId', 'materialId'],
    },
  },

  // --- Search ---
  {
    name: 'search',
    description: 'Search across all user data — tasks, notes, events, and courses — by keyword.',
    inputSchema: {
      type: 'object',
      properties: { q: { type: 'string', description: 'Search query' } },
      required: ['q'],
    },
  },

  // --- Teacher: Groups ---
  {
    name: 'list_groups',
    description: 'List all groups the current teacher manages.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_group_members',
    description: 'List members of a specific group.',
    inputSchema: {
      type: 'object',
      properties: { groupId: { type: 'number' } },
      required: ['groupId'],
    },
  },

  // --- Teacher: Students ---
  {
    name: 'list_students',
    description: 'Search for students by name or email.',
    inputSchema: {
      type: 'object',
      properties: { q: { type: 'string', description: 'Name or email fragment' } },
      required: ['q'],
    },
  },

  // --- Teacher: Assignments ---
  {
    name: 'create_assignment',
    description:
      'Create an assignment for a group (creates one task per member). Use list_groups first.',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: { type: 'number' },
        title: { type: 'string' },
        dueDate: { type: 'string', description: 'ISO format, e.g. 2026-07-01' },
        description: { type: 'string' },
      },
      required: ['groupId', 'title', 'dueDate'],
    },
  },
  {
    name: 'assign_task_to_student',
    description: 'Assign a task directly to a single student. Use list_students first.',
    inputSchema: {
      type: 'object',
      properties: {
        studentId: { type: 'number' },
        title: { type: 'string' },
        dueDate: { type: 'string' },
        description: { type: 'string' },
        courseId: { type: 'number' },
      },
      required: ['studentId', 'title'],
    },
  },
];

const server = new Server(
  { name: 'student-os', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await executeTool(name, (args ?? {}) as Record<string, unknown>);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${String(err)}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
