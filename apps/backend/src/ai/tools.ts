import type OpenAI from 'openai';

const STUDENT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  // --- Tasks ---
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description:
        "List the current user's incomplete to-do tasks (title, dueDate, priority). Use ONLY for questions about tasks or to-do items. Tasks are NOT deadlines — for deadlines use list_events.",
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of tasks to return. Pass 1 for nearest-deadline queries.',
          },
          onlyWithDueDate: {
            type: 'boolean',
            description: 'If true, exclude tasks without a due date.',
          },
        },
      },
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
          dueDate: {
            type: 'string',
            description: 'Due date in ISO format, e.g. 2026-06-15. Default: today',
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH'],
            description: 'Default: LOW',
          },
          courseId: {
            type: 'number',
            description:
              'Optional course ID to link this task to a course. Use list_courses first to find the ID.',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description:
        'Update an existing task. Use when the user wants to change a task title, due date, priority, or description.',
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
      description:
        "List the current user's notes (title, folderId). Use to find notes or answer questions about them.",
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
          courseId: {
            type: 'number',
            description: 'Optional course ID to link this note to a course.',
          },
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
      description:
        "List the current user's calendar events. In this app, DEADLINES are calendar events with type='DEADLINE' — they are NOT tasks. Always use this tool when the user asks about deadlines (termíny in Slovak), their schedule, or upcoming calendar items. Pass limit: 1 when the user asks for the single nearest/next deadline.",
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of events to return, sorted by nearest first. Omit to return all.',
          },
        },
      },
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
      description:
        'List study materials for a specific course. Use list_courses first to find the courseId.',
      parameters: {
        type: 'object',
        properties: {
          courseId: { type: 'number', description: 'Course ID' },
        },
        required: ['courseId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_material_content',
      description:
        'Read the text content of a study material (PDF or webpage) by its ID. Use list_course_materials first to get the materialId. Returns extracted text up to 8000 characters.',
      parameters: {
        type: 'object',
        properties: {
          courseId: { type: 'number', description: 'Course ID the material belongs to' },
          materialId: { type: 'number', description: 'Material ID from list_course_materials' },
        },
        required: ['courseId', 'materialId'],
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

export function getToolsForRole(roles: string[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
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
  read_material_content: false,
  search: false,
  // Teacher tools
  list_groups: false,
  list_group_members: false,
  list_students: false,
  create_assignment: true,
  assign_task_to_student: true,
};
