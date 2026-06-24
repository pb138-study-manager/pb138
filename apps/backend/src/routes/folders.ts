import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as FoldersController from '../controllers/folders.controller';

const CreateFolderSchema = z.object({
  name: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

const UpdateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateFolderInput = z.infer<typeof CreateFolderSchema>;
export type UpdateFolderInput = z.infer<typeof UpdateFolderSchema>;

export const foldersRoutes = new Elysia({ prefix: '/folders' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', ({ user }) => FoldersController.listFolders(user as AuthUser))
  .post(
    '/',
    ({ user, body }) => FoldersController.createFolder(user as AuthUser, body),
    zodBody(CreateFolderSchema)
  )
  .patch(
    '/:id',
    ({ user, params, body }) =>
      FoldersController.updateFolder(user as AuthUser, Number(params.id), body),
    zodBody(UpdateFolderSchema)
  )
  .delete('/:id', ({ user, params }) =>
    FoldersController.deleteFolder(user as AuthUser, Number(params.id))
  );
