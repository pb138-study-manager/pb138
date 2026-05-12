export type AdminAuditLogRow = {
  id: string;
  at: string;
  actor: string;
  description: string;
};

export type AdminUserRow = {
  id: number;
  login: string;
  email: string;
  roles: string[];
  active: boolean;
};

export type AdminRoleRow = {
  id: number;
  name: string;
  permissions: string[];
};

export const mockAuditLogs: AdminAuditLogRow[] = [
  {
    id: '1',
    at: '2026-05-12 09:14:02',
    actor: 'admin',
    description: 'Updated user 42 profile',
  },
  {
    id: '2',
    at: '2026-05-12 08:02:51',
    actor: 'mentor1',
    description: 'Created group "PB138 Team A"',
  },
  {
    id: '3',
    at: '2026-05-11 22:31:10',
    actor: 'admin',
    description: 'Assigned role ADMIN to user 7',
  },
  {
    id: '4',
    at: '2026-05-11 18:05:00',
    actor: 'system',
    description: 'Scheduled job: deadline reminders (dry run)',
  },
];

export const mockAdminUsers: AdminUserRow[] = [
  { id: 1, login: 'admin', email: 'admin@example.com', roles: ['ADMIN'], active: true },
  { id: 2, login: 'mentor1', email: 'mentor1@example.com', roles: ['MENTOR', 'USER'], active: true },
  { id: 3, login: 'student1', email: 'student1@example.com', roles: ['USER'], active: true },
  { id: 4, login: 'inactive', email: 'old@example.com', roles: ['USER'], active: false },
];

export const mockRoles: AdminRoleRow[] = [
  {
    id: 1,
    name: 'USER',
    permissions: ['CREATE_TASK', 'VIEW_OWN_TASKS'],
  },
  {
    id: 2,
    name: 'MENTOR',
    permissions: ['CREATE_TASK', 'ADD_TO_GROUP', 'VIEW_GROUP_TASKS'],
  },
  {
    id: 3,
    name: 'ADMIN',
    permissions: ['MANAGE_USERS', 'VIEW_LOGS', 'MANAGE_SYSTEM'],
  },
];
