import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as MaterialsController from '../controllers/materials.controller';

const CreateMaterialSchema = z.object({
  title: z.string().min(1),
  url: z.string().url().optional(),
  description: z.string().optional(),
});

export type CreateMaterialInput = z.infer<typeof CreateMaterialSchema>;

export const materialsRoutes = new Elysia({ prefix: '/courses' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/:id/materials', ({ params }) =>
    MaterialsController.listMaterials(Number(params.id))
  )
  .post(
    '/:id/materials',
    ({ params, body, user }) =>
      MaterialsController.createMaterial(user as AuthUser, Number(params.id), body),
    zodBody(CreateMaterialSchema)
  )
  .post('/:id/materials/upload', ({ params, request, user }) =>
    MaterialsController.uploadMaterial(user as AuthUser, Number(params.id), request)
  )
  .get('/:id/materials/:matId/download', ({ params, user }) =>
    MaterialsController.downloadMaterial(user as AuthUser, Number(params.id), Number(params.matId))
  )
  .delete('/:id/materials/:matId', ({ params, user }) =>
    MaterialsController.deleteMaterial(user as AuthUser, Number(params.id), Number(params.matId))
  )
  .get('/:id/materials/:matId/content', ({ params }) =>
    MaterialsController.getMaterialContent(Number(params.matId))
  );