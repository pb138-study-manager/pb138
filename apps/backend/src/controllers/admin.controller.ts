import { db } from '../db';
import { users, userProfiles, roles, userRoles, permissions, rolePermissions, auditLogs, tasks, events, notes, folders } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, isNotNull, ilike, notIlike, inArray, desc, or, gte, lte, count } from 'drizzle-orm';
import { NotFoundError, BadRequestError, ConflictError } from '../lib/errors';
import type { PatchRolesInput, ReactivateInput } from '../routes/admin';

export async function listUsers(query: { q?: string; activeOnly?: string; limit?: string; offset?: string }) {
  const q = (query.q ?? '').trim();
  const activeOnly = query.activeOnly === 'true';
  const limit = Math.min(Number(query.limit ?? 50) || 50, 200);
  const offset = Math.max(0, Number(query.offset ?? 0) || 0);

  const conditions = [];
  if (q) conditions.push(or(ilike(users.login, `%${q}%`), ilike(users.email, `%${q}%`)));
  if (activeOnly) conditions.push(isNull(users.deletedAt));

  const allUsers = await db
    .select({ id: users.id, login: users.login, email: users.email, name: userProfiles.name, deletedAt: users.deletedAt })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(limit)
    .offset(offset);

  if (allUsers.length === 0) return [];

  const userIds = allUsers.map((u) => u.id);
  const allUserRoles = await db
    .select({ userId: userRoles.userId, roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(inArray(userRoles.userId, userIds));

  const rolesByUserId = new Map<number, string[]>();
  for (const { userId, roleName } of allUserRoles) {
    const existing = rolesByUserId.get(userId) ?? [];
    existing.push(roleName);
    rolesByUserId.set(userId, existing);
  }

  return allUsers.map((u) => ({ ...u, deletedAt: u.deletedAt?.toISOString() ?? null, roles: rolesByUserId.get(u.id) ?? [] }));
}

export async function patchUserRoles(actor: AuthUser, targetId: number, body: PatchRolesInput) {
  if (isNaN(targetId)) throw new BadRequestError('Invalid user id');

  const [target] = await db.select({ id: users.id, login: users.login }).from(users).where(and(eq(users.id, targetId), isNull(users.deletedAt)));
  if (!target) throw new NotFoundError('User not found');

  const allRoles = await db.select().from(roles);
  const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r.id]));
  const added: string[] = [];
  const removed: string[] = [];

  for (const roleName of body.add ?? []) {
    const roleId = roleMap[roleName];
    if (roleId) {
      await db.insert(userRoles).values({ userId: targetId, roleId }).onConflictDoNothing();
      added.push(roleName);
    }
  }

  for (const roleName of body.remove ?? []) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;
    if (roleName === 'ADMIN') {
      const [{ adminCount }] = await db.select({ adminCount: count() }).from(userRoles).innerJoin(users, and(eq(userRoles.userId, users.id), isNull(users.deletedAt))).where(eq(userRoles.roleId, roleId));
      if (adminCount <= 1) throw new ConflictError('Cannot remove the last admin role');
    }
    await db.delete(userRoles).where(and(eq(userRoles.userId, targetId), eq(userRoles.roleId, roleId)));
    removed.push(roleName);
  }

  const parts: string[] = [];
  if (added.length) parts.push(`added ${added.join(', ')}`);
  if (removed.length) parts.push(`removed ${removed.join(', ')}`);
  const detail = parts.length ? `: ${parts.join('; ')}` : '';
  await logAction(db, actor.id, `Admin updated roles for user ${targetId} (${target.login})${detail}`);

  const updatedRoles = await db.select({ roleName: roles.name }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, targetId));
  return { userId: targetId, roles: updatedRoles.map((r) => r.roleName) };
}

export async function deactivateUser(actor: AuthUser, targetId: number) {
  if (isNaN(targetId)) throw new BadRequestError('Invalid user id');
  if (targetId === actor.id) throw new ConflictError('You cannot deactivate your own account');

  const [target] = await db.select({ id: users.id, login: users.login }).from(users).where(and(eq(users.id, targetId), isNull(users.deletedAt)));
  if (!target) throw new NotFoundError('User not found or already deactivated');

  const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'ADMIN'));
  if (adminRole) {
    const [targetAdminRow] = await db.select().from(userRoles).where(and(eq(userRoles.userId, targetId), eq(userRoles.roleId, adminRole.id)));
    if (targetAdminRow) {
      const [{ adminCount }] = await db.select({ adminCount: count() }).from(userRoles).innerJoin(users, and(eq(userRoles.userId, users.id), isNull(users.deletedAt))).where(eq(userRoles.roleId, adminRole.id));
      if (adminCount <= 1) throw new ConflictError('Cannot deactivate the last admin');
    }
  }

  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, targetId));
  await logAction(db, actor.id, `Admin deactivated user ${targetId} (${target.login})`);
  return { success: true };
}

export async function reactivateUser(actor: AuthUser, targetId: number, body: ReactivateInput) {
  if (isNaN(targetId)) throw new BadRequestError('Invalid user id');

  const [target] = await db.select({ id: users.id, login: users.login }).from(users).where(and(eq(users.id, targetId), isNotNull(users.deletedAt)));
  if (!target) throw new NotFoundError('User not found or already active');

  await db.update(users).set({ deletedAt: null }).where(eq(users.id, targetId));
  if (body.restoreData) {
    await db.update(tasks).set({ deletedAt: null }).where(eq(tasks.userId, targetId));
    await db.update(events).set({ deletedAt: null }).where(eq(events.userId, targetId));
    await db.update(notes).set({ deletedAt: null }).where(eq(notes.userId, targetId));
    await db.update(folders).set({ deletedAt: null }).where(eq(folders.userId, targetId));
  }

  const suffix = body.restoreData ? ' with data restore' : '';
  await logAction(db, actor.id, `Admin reactivated user ${targetId} (${target.login})${suffix}`);
  return { success: true };
}

export async function listAuditLogs(query: { q?: string; actor?: string; from?: string; to?: string; type?: string; limit?: string; offset?: string }) {
  const q = (query.q ?? '').trim();
  const actor = (query.actor ?? '').trim();
  const type = query.type ?? 'all';
  const limit = Math.min(Number(query.limit ?? 50) || 50, 200);
  const offset = Math.max(0, Number(query.offset ?? 0) || 0);

  const conditions = [];
  if (q) conditions.push(ilike(auditLogs.description, `%${q}%`));
  if (actor) conditions.push(ilike(users.login, `%${actor}%`));
  if (query.from) conditions.push(gte(auditLogs.happenedAt, new Date(query.from)));
  if (query.to) conditions.push(lte(auditLogs.happenedAt, new Date(query.to)));
  if (type === 'admin') conditions.push(ilike(auditLogs.description, 'Admin %'));
  if (type === 'user') conditions.push(notIlike(auditLogs.description, 'Admin %'));

  const rows = await db
    .select({ id: auditLogs.id, actorId: auditLogs.actorId, actorLogin: users.login, description: auditLogs.description, happenedAt: auditLogs.happenedAt })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.happenedAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({ ...r, happenedAt: r.happenedAt.toISOString() }));
}

export async function listRoles() {
  const allRoles = await db.select().from(roles);
  const allRolePerms = await db
    .select({ roleId: rolePermissions.roleId, permName: permissions.name })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

  const permsByRoleId = new Map<number, string[]>();
  for (const { roleId, permName } of allRolePerms) {
    const existing = permsByRoleId.get(roleId) ?? [];
    existing.push(permName);
    permsByRoleId.set(roleId, existing);
  }

  return allRoles.map((r) => ({ id: r.id, name: r.name, permissions: permsByRoleId.get(r.id) ?? [] }));
}
