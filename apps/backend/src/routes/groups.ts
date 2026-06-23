import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as GroupsController from '../controllers/groups.controller';

const CreateGroupSchema = z.object({ name: z.string().min(1) });
const AddMembersSchema = z.object({ userIds: z.array(z.number()) });
const CreateAssignmentSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string(),
  description: z.string().optional(),
});

export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type AddMembersInput = z.infer<typeof AddMembersSchema>;
export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;

export const groupsRoutes = new Elysia({ prefix: '/groups' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', ({ user }) => GroupsController.listGroups(user as AuthUser))
  .post('/', ({ user, body }) => GroupsController.createGroup(user as AuthUser, body), zodBody(CreateGroupSchema))
  .get('/:id', ({ user, params }) => GroupsController.getGroup(user as AuthUser, parseInt(params.id)))
  .delete('/:id', ({ user, params }) => GroupsController.deleteGroup(user as AuthUser, parseInt(params.id)))
  .post('/:id/members', ({ user, params, body }) => GroupsController.addMembers(user as AuthUser, parseInt(params.id), body), zodBody(AddMembersSchema))
  .delete('/:id/members/:userId', ({ user, params }) =>
    GroupsController.removeMember(user as AuthUser, parseInt(params.id), parseInt(params.userId))
  )
  .get('/:id/assignments', ({ user, params }) => GroupsController.listAssignments(user as AuthUser, parseInt(params.id)))
  .post('/:id/assignments', ({ user, params, body }) => GroupsController.createAssignment(user as AuthUser, parseInt(params.id), body), zodBody(CreateAssignmentSchema));
