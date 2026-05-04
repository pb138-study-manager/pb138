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
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleNameEnum = pgEnum('role_name', ['USER', 'MENTOR', 'ADMIN', 'TEACHER']);
export const taskStatusEnum = pgEnum('task_status', ['TODO', 'IN PROGRESS', 'DONE']);
export const groupTypeEnum = pgEnum('group_type', ['SEMINAR', 'GROUP']);

// ---------------------------------------------------------------------------
// User & Auth
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  authId: text('auth_id').unique(), // Supabase Auth UUID
  email: text('email').notNull().unique(),
  login: text('login').notNull().unique(),
  pwdHash: text('pwd_hash').notNull().default(''),  // managed by Supabase Auth, kept for schema completeness
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
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: timestamp('due_date').notNull(),
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

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  assignmentId: integer('assignment_id').references(() => assignments.id),
  courseId: integer('course_id').references(() => courses.id),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: timestamp('due_date').notNull(),
  status: taskStatusEnum('status').notNull().default('TODO'),
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

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  place: text('place'),
  courseId: integer('course_id').references(() => courses.id),
  deletedAt: timestamp('deleted_at'),
});

export const folders = pgTable('folders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  folderId: integer('folder_id').references(() => folders.id),
  courseId: integer('course_id').references(() => courses.id),
  deletedAt: timestamp('deleted_at'),
});

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

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id')
    .notNull()
    .references(() => users.id),
  happenedAt: timestamp('happened_at').notNull().defaultNow(),
  description: text('description').notNull(),
});

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
    userServiceUnique: unique('user_integrations_user_service_unique').on(table.userId, table.service),
  })
);
