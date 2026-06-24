import { db } from '../db';
import { groups, groupMembers, users, assignments, tasks, events } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, inArray, or } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, BadRequestError } from '../lib/errors';
import type { CreateGroupInput, AddMembersInput, CreateAssignmentInput } from '../routes/groups';

export async function listGroups(user: AuthUser) {
  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id));
  const memberGroupIds = memberRows.map((r) => r.groupId);

  return db
    .select({ id: groups.id, name: groups.name, type: groups.type, mentorId: groups.mentorId, deletedAt: groups.deletedAt })
    .from(groups)
    .where(
      and(
        isNull(groups.deletedAt),
        memberGroupIds.length > 0
          ? or(eq(groups.mentorId, user.id), inArray(groups.id, memberGroupIds))
          : eq(groups.mentorId, user.id)
      )
    );
}

export async function createGroup(user: AuthUser, body: CreateGroupInput) {
  const type = user.roles.includes('TEACHER') ? ('SEMINAR' as const) : ('GROUP' as const);
  const [group] = await db.insert(groups).values({ name: body.name, mentorId: user.id, type }).returning();
  await logAction(db, user.id, `Created group ${group.id}: ${group.name}`);
  return group;
}

async function requireGroupAccess(groupId: number, userId: number, requireMentor = false) {
  if (isNaN(groupId)) throw new BadRequestError('Invalid group id');
  const [group] = await db.select().from(groups).where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));
  if (!group) throw new NotFoundError('Group not found');
  if (requireMentor && group.mentorId !== userId)
    throw new ForbiddenError('Only the group mentor can perform this action');
  if (!requireMentor && group.mentorId !== userId) {
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    if (!membership) throw new ForbiddenError('Access denied');
  }
  return group;
}

export async function getGroup(user: AuthUser, groupId: number) {
  const group = await requireGroupAccess(groupId, user.id);
  const members = await db
    .select({ id: users.id, login: users.login, email: users.email })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(and(eq(groupMembers.groupId, groupId), isNull(users.deletedAt)));
  return { ...group, members };
}

export async function deleteGroup(user: AuthUser, groupId: number) {
  const group = await requireGroupAccess(groupId, user.id, true);
  await db.update(groups).set({ deletedAt: new Date() }).where(eq(groups.id, group.id));
  await logAction(db, user.id, `Deleted group ${groupId}`);
  return { success: true };
}

export async function addMembers(user: AuthUser, groupId: number, body: AddMembersInput) {
  await requireGroupAccess(groupId, user.id, true);
  if (body.userIds.length > 0) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, body.userIds), isNull(users.deletedAt)));
    if (existing.length !== body.userIds.length)
      throw new BadRequestError('One or more user IDs are invalid');
  }
  await db.insert(groupMembers).values(body.userIds.map((uid) => ({ userId: uid, groupId }))).onConflictDoNothing();
  await logAction(db, user.id, `Added members to group ${groupId}`);
  return { success: true };
}

export async function removeMember(user: AuthUser, groupId: number, targetUserId: number) {
  if (isNaN(targetUserId)) throw new BadRequestError('Invalid user id');
  await requireGroupAccess(groupId, user.id, true);
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)));
  if (!membership) throw new NotFoundError('User is not a member of this group');
  await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)));
  await logAction(db, user.id, `Removed user ${targetUserId} from group ${groupId}`);
  return { success: true };
}

export async function listAssignments(user: AuthUser, groupId: number) {
  await requireGroupAccess(groupId, user.id);
  return db.select().from(assignments).where(and(eq(assignments.groupId, groupId), isNull(assignments.deletedAt)));
}

export async function createAssignment(
  user: AuthUser,
  groupId: number,
  body: CreateAssignmentInput
) {
  await requireGroupAccess(groupId, user.id, true);
  if (isNaN(new Date(body.dueDate).getTime())) throw new BadRequestError('Invalid dueDate format');

  const memberRows = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .innerJoin(users, and(eq(groupMembers.userId, users.id), isNull(users.deletedAt)))
    .where(eq(groupMembers.groupId, groupId));

  const deadline = new Date(body.dueDate);

  const assignment = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(assignments)
      .values({ groupId, title: body.title, description: body.description, dueDate: deadline })
      .returning();

    if (memberRows.length > 0) {
      await tx.insert(tasks).values(
        memberRows.map((m) => ({
          userId: m.userId,
          assignmentId: created.id,
          title: body.title,
          description: body.description,
          dueDate: deadline,
        }))
      );
      await tx.insert(events).values(
        memberRows.map((m) => ({
          userId: m.userId,
          assignmentId: created.id,
          title: body.title,
          description: body.description ?? null,
          startDate: deadline,
          endDate: deadline,
          type: 'DEADLINE' as const,
        }))
      );
    }

    return created;
  });

  await logAction(db, user.id, `Created assignment ${assignment.id} for group ${groupId}`);
  return { assignment, tasksCreated: memberRows.length };
}
