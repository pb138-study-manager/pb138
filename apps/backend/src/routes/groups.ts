import { Elysia, t } from 'elysia';
import { db } from '../db';
import { groups, groupMembers, users, assignments, tasks } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { eq, and, isNull, inArray, or } from 'drizzle-orm';
import { logAction } from '../services/audit';

export const groupsRoutes = new Elysia({ prefix: '/groups' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', async ({ user }) => {
    const uid = (user as AuthUser).id;

    // Find all groups where the user is a member
    const memberRows = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, uid));
    const memberGroupIds = memberRows.map((r) => r.groupId);

    // Return groups where user is mentor OR a member (soft-delete filtered)
    return db
      .select({
        id: groups.id,
        name: groups.name,
        type: groups.type,
        mentorId: groups.mentorId,
        deletedAt: groups.deletedAt,
      })
      .from(groups)
      .where(
        and(
          isNull(groups.deletedAt),
          memberGroupIds.length > 0
            ? or(eq(groups.mentorId, uid), inArray(groups.id, memberGroupIds))
            : eq(groups.mentorId, uid)
        )
      );
  })
  .post(
    '/',
    async ({ body, user }) => {
      const uid = (user as AuthUser).id;
      const isTeacher = (user as AuthUser).roles.includes('TEACHER');
      const type = isTeacher ? ('SEMINAR' as const) : ('GROUP' as const);
      const [group] = await db
        .insert(groups)
        .values({ name: body.name, mentorId: uid, type })
        .returning();
      await logAction(db, uid, `Created group ${group.id}: ${group.name}`);
      return group;
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
      }),
    }
  )
  .get('/:id', async ({ params, user, set }) => {
    const uid = (user as AuthUser).id;
    const groupId = parseInt(params.id);

    if (isNaN(groupId)) {
      set.status = 400;
      return { error: 'BAD_REQUEST', message: 'Invalid group id' };
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

    if (!group) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Group not found' };
    }

    const isMentor = group.mentorId === uid;
    if (!isMentor) {
      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, uid)));
      if (!membership) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Access denied' };
      }
    }

    const members = await db
      .select({ id: users.id, login: users.login, email: users.email })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(and(eq(groupMembers.groupId, groupId), isNull(users.deletedAt)));

    return { ...group, members };
  })
  .delete('/:id', async ({ params, user, set }) => {
    const uid = (user as AuthUser).id;
    const groupId = parseInt(params.id);

    if (isNaN(groupId)) {
      set.status = 400;
      return { error: 'BAD_REQUEST', message: 'Invalid group id' };
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

    if (!group) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Group not found' };
    }
    if (group.mentorId !== uid) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Only the group mentor can delete this group' };
    }

    await db.update(groups).set({ deletedAt: new Date() }).where(eq(groups.id, groupId));
    await logAction(db, uid, `Deleted group ${groupId}`);
    return { success: true };
  })
  .post(
    '/:id/members',
    async ({ params, body, user, set }) => {
      const uid = (user as AuthUser).id;
      const groupId = parseInt(params.id);

      if (isNaN(groupId)) {
        set.status = 400;
        return { error: 'BAD_REQUEST', message: 'Invalid group id' };
      }

      const [group] = await db
        .select()
        .from(groups)
        .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

      if (!group) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Group not found' };
      }
      if (group.mentorId !== uid) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Only the group mentor can add members' };
      }

      // Verify all provided users exist and are not soft-deleted
      if (body.userIds.length > 0) {
        const existingUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(inArray(users.id, body.userIds), isNull(users.deletedAt)));
        if (existingUsers.length !== body.userIds.length) {
          set.status = 400;
          return { error: 'BAD_REQUEST', message: 'One or more user IDs are invalid' };
        }
      }

      await db
        .insert(groupMembers)
        .values(body.userIds.map((memberId) => ({ userId: memberId, groupId })))
        .onConflictDoNothing();
      await logAction(db, uid, `Added members to group ${groupId}`);
      return { success: true };
    },
    {
      body: t.Object({
        userIds: t.Array(t.Number()),
      }),
    }
  )
  .delete('/:id/members/:userId', async ({ params, user, set }) => {
    const uid = (user as AuthUser).id;
    const groupId = parseInt(params.id);
    const targetUserId = parseInt(params.userId);

    if (isNaN(groupId) || isNaN(targetUserId)) {
      set.status = 400;
      return { error: 'BAD_REQUEST', message: 'Invalid id' };
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

    if (!group) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Group not found' };
    }
    if (group.mentorId !== uid) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Only the group mentor can remove members' };
    }

    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)));

    if (!membership) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'User is not a member of this group' };
    }

    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)));
    await logAction(db, uid, `Removed user ${targetUserId} from group ${groupId}`);
    return { success: true };
  })
  .get('/:id/assignments', async ({ params, user, set }) => {
    const uid = (user as AuthUser).id;
    const groupId = parseInt(params.id);

    if (isNaN(groupId)) {
      set.status = 400;
      return { error: 'BAD_REQUEST', message: 'Invalid group id' };
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

    if (!group) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Group not found' };
    }

    const isMentor = group.mentorId === uid;
    if (!isMentor) {
      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, uid)));
      if (!membership) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Access denied' };
      }
    }

    return db
      .select()
      .from(assignments)
      .where(and(eq(assignments.groupId, groupId), isNull(assignments.deletedAt)));
  })
  .post(
    '/:id/assignments',
    async ({ params, body, user, set }) => {
      const uid = (user as AuthUser).id;
      const groupId = parseInt(params.id);

      if (isNaN(groupId)) {
        set.status = 400;
        return { error: 'BAD_REQUEST', message: 'Invalid group id' };
      }

      const [group] = await db
        .select()
        .from(groups)
        .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

      if (!group) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Group not found' };
      }
      if (group.mentorId !== uid) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Only the group mentor can create assignments' };
      }

      const [assignment] = await db
        .insert(assignments)
        .values({
          groupId,
          title: body.title,
          description: body.description,
          dueDate: new Date(body.dueDate),
        })
        .returning();

      const memberRows = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, groupId));

      if (memberRows.length > 0) {
        await db.insert(tasks).values(
          memberRows.map((m) => ({
            userId: m.userId,
            assignmentId: assignment.id,
            title: body.title,
            description: body.description,
            dueDate: new Date(body.dueDate),
          }))
        );
      }

      await logAction(db, uid, `Created assignment ${assignment.id} for group ${groupId}`);
      return { assignment, tasksCreated: memberRows.length };
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        dueDate: t.String(),
        description: t.Optional(t.String()),
      }),
    }
  );
