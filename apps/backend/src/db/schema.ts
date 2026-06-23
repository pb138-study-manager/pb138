import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  primaryKey,
  unique,
  jsonb,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleNameEnum = pgEnum('role_name', ['USER', 'ADMIN', 'TEACHER']);
export const taskStatusEnum = pgEnum('task_status', ['TODO', 'IN PROGRESS', 'DONE']);
export const groupTypeEnum = pgEnum('group_type', ['SEMINAR', 'GROUP']);
export const eventTypeEnum = pgEnum('event_type', ['EVENT', 'DEADLINE']);
export const evalTypeEnum = pgEnum('eval_type', ['none', 'pass_fail', 'graded']);
export const taskPriorityEnum = pgEnum('task_priority', ['LOW', 'MEDIUM', 'HIGH']);

// ---------------------------------------------------------------------------
// User & Auth
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  authId: text('auth_id').unique(), // Supabase Auth UUID
  email: text('email').notNull().unique(),
  login: text('login').notNull().unique(),
  pwdHash: text('pwd_hash').notNull().default(''), // managed by Supabase Auth, kept for schema completeness
  activeSession: boolean('active_session').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
});

export const userProfiles = pgTable('user_profiles', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id),
  name: text('name'),
  title: text('title'),
  avatar: text('avatar'),
  organization: text('organization'),
  bio: text('bio'),
});

export const userSettings = pgTable('user_settings', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  lightTheme: boolean('light_theme').notNull().default(true),
  language: text('language').notNull().default('en'),
  customNav: jsonb('custom_nav'),
  calendarToken: text('calendar_token'),
});

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: roleNameEnum('name').notNull().unique(),
});

export const userRoles = pgTable(
  'user_roles',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  })
);

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissions.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  })
);

// ---------------------------------------------------------------------------
// Groups & Assignments
// ---------------------------------------------------------------------------

export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  mentorId: integer('mentor_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  type: groupTypeEnum('type').notNull().default('GROUP'),
  deletedAt: timestamp('deleted_at'),
});

export const groupMembers = pgTable(
  'group_members',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    groupId: integer('group_id')
      .notNull()
      .references(() => groups.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.groupId] }),
  })
);

export const assignments = pgTable('assignments', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id),
  title: text('title').notNull(),
  description: text('description'),
  courseId: integer('course_id').references(() => courses.id),
  dueDate: timestamp('due_date').notNull(),
  evalType: evalTypeEnum('eval_type').notNull().default('none'),
  deletedAt: timestamp('deleted_at'),
});

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name'),
  semester: text('semester').notNull(),
  color: text('color'),
  lectureSchedule: text('lecture_schedule'),
  seminarSchedule: text('seminar_schedule'),
  lectureTeacherId: integer('lecture_teacher_id').references(() => users.id),
  seminarTeacherId: integer('seminar_teacher_id').references(() => users.id),
  deletedAt: timestamp('deleted_at'),
});

export const userCourses = pgTable(
  'user_courses',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.courseId] }),
  })
);

// ---------------------------------------------------------------------------
// Tasks & Evaluations
// ---------------------------------------------------------------------------

export const tasks = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    assignmentId: integer('assignment_id').references(() => assignments.id),
    courseId: integer('course_id').references(() => courses.id),
    parentId: integer('parent_id').references((): AnyPgColumn => tasks.id),
    title: text('title').notNull(),
    description: text('description'),
    dueDate: timestamp('due_date'),
    status: taskStatusEnum('status').notNull().default('TODO'),
    completedAt: timestamp('completed_at'),
    priority: taskPriorityEnum('priority'),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    userIdIdx: index('tasks_user_id_idx').on(table.userId),
    dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
  })
);

export const assignmentSubtasks = pgTable('assignment_subtasks', {
  id: serial('id').primaryKey(),
  assignmentId: integer('assignment_id')
    .notNull()
    .references(() => assignments.id),
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at'),
});

export const evals = pgTable('evals', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id')
    .notNull()
    .references(() => tasks.id),
  feedback: text('feedback').notNull(),
  score: integer('score').notNull(),
  evaluatedAt: timestamp('evaluated_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Events, Folders & Notes
// ---------------------------------------------------------------------------

export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    title: text('title').notNull(),
    description: text('description'),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    place: text('place'),
    type: eventTypeEnum('type').notNull().default('EVENT'),
    courseId: integer('course_id').references(() => courses.id),
    assignmentId: integer('assignment_id').references(() => assignments.id),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    userIdIdx: index('events_user_id_idx').on(table.userId),
    startDateIdx: index('events_start_date_idx').on(table.startDate),
  })
);

export const folders = pgTable(
  'folders',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    userIdIdx: index('folders_user_id_idx').on(table.userId),
  })
);

export const notes = pgTable(
  'notes',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    title: text('title').notNull(),
    description: text('description'),
    folderId: integer('folder_id').references(() => folders.id),
    courseId: integer('course_id').references(() => courses.id),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    userIdIdx: index('notes_user_id_idx').on(table.userId),
  })
);

// ---------------------------------------------------------------------------
// Notifications & Audit
// ---------------------------------------------------------------------------

export const emailTemplates = pgTable('email_templates', {
  id: serial('id').primaryKey(),
  type: text('type').notNull().unique(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
});

export const emails = pgTable('emails', {
  id: serial('id').primaryKey(),
  recipientId: integer('recipient_id')
    .notNull()
    .references(() => users.id),
  templateId: integer('template_id')
    .notNull()
    .references(() => emailTemplates.id),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
  status: text('status').notNull(), // 'SENT' | 'FAILED' | 'PENDING'
  deletedAt: timestamp('deleted_at'),
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    actorId: integer('actor_id')
      .notNull()
      .references(() => users.id),
    happenedAt: timestamp('happened_at').notNull().defaultNow(),
    description: text('description').notNull(),
  },
  (table) => ({
    actorIdIdx: index('audit_logs_actor_id_idx').on(table.actorId),
    happenedAtIdx: index('audit_logs_happened_at_idx').on(table.happenedAt),
  })
);

// ---------------------------------------------------------------------------
// User Integrations
// ---------------------------------------------------------------------------

export const userIntegrations = pgTable(
  'user_integrations',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    service: text('service').notNull(),
    connected: boolean('connected').notNull().default(false),
    connectedAt: timestamp('connected_at'),
  },
  (table) => ({
    userServiceUnique: unique('user_integrations_user_service_unique').on(
      table.userId,
      table.service
    ),
  })
);

// ---------------------------------------------------------------------------
// Study Materials
// ---------------------------------------------------------------------------

export const studyMaterials = pgTable('study_materials', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  url: text('url'),
  storagePath: text('storage_path'),
  description: text('description'),
  deletedAt: timestamp('deleted_at'),
});
