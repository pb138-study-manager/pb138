import { Elysia } from 'elysia';
import { z } from 'zod';
import { db } from '../db';
import {
  users,
  userProfiles,
  roles,
  userRoles,
  permissions,
  rolePermissions,
  auditLogs,
} from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, isNotNull, ilike, inArray, desc, or, gte, lte, count } from 'drizzle-orm';
import { zodBody } from '../lib/validation';

const PatchRolesSchema = z.object({
  add: z.array(z.enum(['USER', 'ADMIN', 'TEACHER'])).optional(),
  remove: z.array(z.enum(['USER', 'ADMIN', 'TEACHER'])).optional(),
});

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
    if (!(user as AuthUser).roles.includes('ADMIN')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Admin access required' };
    }
  })

  // GET /admin/users?q=&limit=50&offset=0
  .get('/users', async ({ query }) => {
    const q = (query.q as string | undefined)?.trim() ?? '';
    const limit = Math.min(Number(query.limit ?? 50) || 50, 200);
    const offset = Math.max(0, Number(query.offset ?? 0) || 0);

    const baseQuery = db
      .select({
        id: users.id,
        login: users.login,
        email: users.email,
        name: userProfiles.name,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId));

    const allUsers = await (q
      ? baseQuery.where(or(ilike(users.login, `%${q}%`), ilike(users.email, `%${q}%`)))
      : baseQuery
    )
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

    return allUsers.map((u) => ({
      ...u,
      deletedAt: u.deletedAt?.toISOString() ?? null,
      roles: rolesByUserId.get(u.id) ?? [],
    }));
  })

  // PATCH /admin/users/:id/roles
  .patch(
    '/users/:id/roles',
    async ({ params, body, user, set }) => {
      const targetId = Number(params.id);
      const authUser = user as AuthUser;

      if (isNaN(targetId)) {
        set.status = 400;
        return { error: 'BAD_REQUEST', message: 'Invalid user id' };
      }

      const [target] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, targetId), isNull(users.deletedAt)));
      if (!target) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'User not found' };
      }

      const allRoles = await db.select().from(roles);
      const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r.id]));

      for (const roleName of body.add ?? []) {
        const roleId = roleMap[roleName];
        if (roleId) {
          await db.insert(userRoles).values({ userId: targetId, roleId }).onConflictDoNothing();
        }
      }

      for (const roleName of body.remove ?? []) {
        const roleId = roleMap[roleName];
        if (!roleId) continue;

        if (roleName === 'ADMIN') {
          const [{ adminCount }] = await db
            .select({ adminCount: count() })
            .from(userRoles)
            .innerJoin(users, and(eq(userRoles.userId, users.id), isNull(users.deletedAt)))
            .where(eq(userRoles.roleId, roleId));
          if (adminCount <= 1) {
            set.status = 409;
            return { error: 'LAST_ADMIN', message: 'Cannot remove the last admin role' };
          }
        }

        await db
          .delete(userRoles)
          .where(and(eq(userRoles.userId, targetId), eq(userRoles.roleId, roleId)));
      }

      await logAction(db, authUser.id, `Admin updated roles for user ${targetId}`);

      const updatedRoles = await db
        .select({ roleName: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, targetId));

      return { userId: targetId, roles: updatedRoles.map((r) => r.roleName) };
    },
    zodBody(PatchRolesSchema)
  )

  // DELETE /admin/users/:id  — deactivates (sets deleted_at), does not remove data
  .delete('/users/:id', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    const targetId = Number(params.id);

    if (isNaN(targetId)) {
      set.status = 400;
      return { error: 'BAD_REQUEST', message: 'Invalid user id' };
    }
    if (targetId === authUser.id) {
      set.status = 409;
      return { error: 'SELF_DEACTIVATE', message: 'You cannot deactivate your own account' };
    }

    const [target] = await db
      .select({ id: users.id, login: users.login })
      .from(users)
      .where(and(eq(users.id, targetId), isNull(users.deletedAt)));
    if (!target) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'User not found or already deactivated' };
    }

    const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'ADMIN'));
    if (adminRole) {
      const [targetAdminRow] = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, targetId), eq(userRoles.roleId, adminRole.id)));

      if (targetAdminRow) {
        const [{ adminCount }] = await db
          .select({ adminCount: count() })
          .from(userRoles)
          .innerJoin(users, and(eq(userRoles.userId, users.id), isNull(users.deletedAt)))
          .where(eq(userRoles.roleId, adminRole.id));
        if (adminCount <= 1) {
          set.status = 409;
          return { error: 'LAST_ADMIN', message: 'Cannot deactivate the last admin' };
        }
      }
    }

    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, targetId));
    await logAction(db, authUser.id, `Admin deactivated user ${targetId} (${target.login})`);
    return { success: true };
  })

  // POST /admin/users/:id/reactivate
  .post('/users/:id/reactivate', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    const targetId = Number(params.id);

    if (isNaN(targetId)) {
      set.status = 400;
      return { error: 'BAD_REQUEST', message: 'Invalid user id' };
    }

    const [target] = await db
      .select({ id: users.id, login: users.login })
      .from(users)
      .where(and(eq(users.id, targetId), isNotNull(users.deletedAt)));
    if (!target) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'User not found or already active' };
    }

    await db.update(users).set({ deletedAt: null }).where(eq(users.id, targetId));
    await logAction(db, authUser.id, `Admin reactivated user ${targetId} (${target.login})`);
    return { success: true };
  })

  // GET /admin/audit-logs?q=&actor=&from=&to=&limit=50&offset=0
  .get('/audit-logs', async ({ query }) => {
    const q = (query.q as string | undefined)?.trim() ?? '';
    const actor = (query.actor as string | undefined)?.trim() ?? '';
    const from = query.from as string | undefined;
    const to = query.to as string | undefined;
    const limit = Math.min(Number(query.limit ?? 50) || 50, 200);
    const offset = Math.max(0, Number(query.offset ?? 0) || 0);

    const conditions = [];
    if (q) conditions.push(ilike(auditLogs.description, `%${q}%`));
    if (actor) conditions.push(ilike(users.login, `%${actor}%`));
    if (from) conditions.push(gte(auditLogs.happenedAt, new Date(from)));
    if (to) conditions.push(lte(auditLogs.happenedAt, new Date(to)));

    const rows = await db
      .select({
        id: auditLogs.id,
        actorId: auditLogs.actorId,
        actorLogin: users.login,
        description: auditLogs.description,
        happenedAt: auditLogs.happenedAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.happenedAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      ...r,
      happenedAt: r.happenedAt.toISOString(),
    }));
  })

  // GET /admin/roles
  .get('/roles', async () => {
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

    return allRoles.map((r) => ({
      id: r.id,
      name: r.name,
      permissions: permsByRoleId.get(r.id) ?? [],
    }));
  });
