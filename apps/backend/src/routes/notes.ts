import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as NotesController from '../controllers/notes.controller';

const CreateNoteSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  folderId: z.number().optional(),
  courseId: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  folderId: z.number().nullable().optional(),
  courseId: z.number().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;

export const notesRoutes = new Elysia({ prefix: '/notes' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', ({ user }) => NotesController.listNotes(user as AuthUser))
  .post(
    '/',
    ({ user, body }) => NotesController.createNote(user as AuthUser, body),
    zodBody(CreateNoteSchema)
  )
  .get('/:id', ({ user, params }) => NotesController.getNote(user as AuthUser, Number(params.id)))
  .patch(
    '/:id',
    ({ user, params, body }) =>
      NotesController.updateNote(user as AuthUser, Number(params.id), body),
    zodBody(UpdateNoteSchema)
  )
  .delete('/:id', ({ user, params }) =>
    NotesController.deleteNote(user as AuthUser, Number(params.id))
  );
