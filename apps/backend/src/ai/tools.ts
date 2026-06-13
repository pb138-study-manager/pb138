import type OpenAI from 'openai';

// Catalogue of tools the AI agent may call.
// `description` is what the model reads to decide WHEN to use a tool — keep it clear.
export const AGENT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
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
          courseId: { type: 'number', description: 'Optional course ID to link this note to a course. Use list_courses first to find the ID.' },
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
      description: "List the courses the current user is enrolled in.",
      parameters: { type: 'object', properties: {} },
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

// Which tools CHANGE data → must be confirmed by the user before running.
// Read-only tools run immediately; mutating tools wait for confirmation.
export const TOOL_MUTATES: Record<string, boolean> = {
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
  search: false,
};