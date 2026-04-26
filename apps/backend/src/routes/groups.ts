import { Elysia, t } from 'elysia';
import { db } from '../db';
import { groups, groupMembers, users } from '../db/schema';
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
      .where(eq(groupMembers.groupId, groupId));

    return { ...group, members };
  });
