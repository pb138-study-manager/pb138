import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { roles, permissions, rolePermissions, emailTemplates } from './schema';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/pb138';

const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
  console.log('🌱 Seeding database...');

  // ---------------------------------------------------------------------------
  // Roles
  // ---------------------------------------------------------------------------
  console.log('  → Inserting roles...');
  const insertedRoles = await db
    .insert(roles)
    .values([{ name: 'USER' }, { name: 'MENTOR' }, { name: 'ADMIN' }, { name: 'TEACHER' }])
    .onConflictDoNothing()
    .returning();

  console.log(`     ✓ ${insertedRoles.length} roles inserted (duplicates skipped)`);

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------
  console.log('  → Inserting permissions...');
  const insertedPermissions = await db
    .insert(permissions)
    .values([
      { name: 'CREATE_TASK' },
      { name: 'EDIT_TASK' },
      { name: 'DELETE_TASK' },
      { name: 'CREATE_EVENT' },
      { name: 'EDIT_EVENT' },
      { name: 'DELETE_EVENT' },
      { name: 'CREATE_NOTE' },
      { name: 'EDIT_NOTE' },
      { name: 'DELETE_NOTE' },
      { name: 'MANAGE_GROUP' },
      { name: 'ADD_TO_GROUP' },
      { name: 'REMOVE_FROM_GROUP' },
      { name: 'ASSIGN_TASK' },
      { name: 'EVALUATE_TASK' },
      { name: 'SEARCH_USERS' },
      { name: 'MANAGE_USERS' },
      { name: 'MANAGE_ROLES' },
      { name: 'VIEW_LOGS' },
      { name: 'MANAGE_SYSTEM_SETTINGS' },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`     ✓ ${insertedPermissions.length} permissions inserted (duplicates skipped)`);

  // ---------------------------------------------------------------------------
  // Role → Permission mappings
  // ---------------------------------------------------------------------------
  console.log('  → Mapping permissions to roles...');

  // Fetch all roles and permissions from DB (handles re-runs where inserts return 0)
  const allRoles = await db.select().from(roles);
  const allPermissions = await db.select().from(permissions);

  const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r.id]));
  const permMap = Object.fromEntries(allPermissions.map((p) => [p.name, p.id]));

  const userPermissions = [
    'CREATE_TASK', 'EDIT_TASK', 'DELETE_TASK',
    'CREATE_EVENT', 'EDIT_EVENT', 'DELETE_EVENT',
    'CREATE_NOTE', 'EDIT_NOTE', 'DELETE_NOTE',
  ];

  const mentorPermissions = [
    ...userPermissions,
    'MANAGE_GROUP', 'ADD_TO_GROUP', 'REMOVE_FROM_GROUP',
    'ASSIGN_TASK', 'EVALUATE_TASK', 'SEARCH_USERS',
  ];

  const adminPermissions = [
    ...mentorPermissions,
    'MANAGE_USERS', 'MANAGE_ROLES', 'VIEW_LOGS', 'MANAGE_SYSTEM_SETTINGS',
  ];

  const mappings = [
    ...userPermissions.map((p) => ({ roleId: roleMap['USER'], permissionId: permMap[p] })),
    ...mentorPermissions.map((p) => ({ roleId: roleMap['MENTOR'], permissionId: permMap[p] })),
    ...adminPermissions.map((p) => ({ roleId: roleMap['ADMIN'], permissionId: permMap[p] })),
  ];

  await db.insert(rolePermissions).values(mappings).onConflictDoNothing();
  console.log('     ✓ Role permissions mapped');

  // ---------------------------------------------------------------------------
  // Email Templates
  // ---------------------------------------------------------------------------
  console.log('  → Inserting email templates...');
  const insertedTemplates = await db
    .insert(emailTemplates)
    .values([
      {
        type: 'REGISTRATION_VERIFY',
        subject: 'Verify your Study Manager account',
        body: 'Hello, please verify your account by clicking the link: {{link}}',
      },
      {
        type: 'PASSWORD_CHANGE',
        subject: 'Your password has been changed',
        body: 'Hello {{name}}, your password was recently changed. If this was not you, contact support.',
      },
      {
        type: 'TASK_ASSIGNED',
        subject: 'New task assigned to you',
        body: 'Hello {{name}}, you have been assigned a new task: {{taskTitle}}. Due date: {{dueDate}}.',
      },
      {
        type: 'TASK_EVALUATED',
        subject: 'Your task has been evaluated',
        body: 'Hello {{name}}, your task "{{taskTitle}}" has been evaluated. Score: {{score}}. Feedback: {{feedback}}.',
      },
      {
        type: 'GROUP_INVITE',
        subject: 'You have been added to a group',
        body: 'Hello {{name}}, you have been added to the group "{{groupName}}" by {{mentorName}}.',
      },
      {
        type: 'GROUP_REMOVE',
        subject: 'You have been removed from a group',
        body: 'Hello {{name}}, you have been removed from the group "{{groupName}}".',
      },
      {
        type: 'DEADLINE_REMINDER',
        subject: 'Upcoming deadline reminder',
        body: 'Hello {{name}}, this is a reminder that "{{title}}" is due in less than 24 hours ({{dueDate}}).',
      },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`     ✓ ${insertedTemplates.length} email templates inserted (duplicates skipped)`);

  console.log('\n✅ Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
