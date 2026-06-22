import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as EventsController from '../controllers/events.controller';

const CreateEventSchema = z
  .object({
    title: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
    description: z.string().optional(),
    place: z.string().optional(),
    type: z.enum(['EVENT', 'DEADLINE']).optional(),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'startDate must not be after endDate',
    path: ['startDate'],
  });

const UpdateEventSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    place: z.string().optional(),
    type: z.enum(['EVENT', 'DEADLINE']).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) return new Date(data.startDate) <= new Date(data.endDate);
      return true;
    },
    { message: 'startDate must not be after endDate', path: ['startDate'] }
  );

export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

export const eventsRoutes = new Elysia({ prefix: '/events' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', ({ user, query }) => EventsController.listEvents(user as AuthUser, query))
  .post(
    '/',
    ({ user, body }) => EventsController.createEvent(user as AuthUser, body),
    zodBody(CreateEventSchema)
  )
  .get('/:id', ({ user, params }) => EventsController.getEvent(user as AuthUser, Number(params.id)))
  .patch(
    '/:id',
    ({ user, params, body }) =>
      EventsController.updateEvent(user as AuthUser, Number(params.id), body),
    zodBody(UpdateEventSchema)
  )
  .delete('/:id', ({ user, params }) =>
    EventsController.deleteEvent(user as AuthUser, Number(params.id))
  );

export const eventsIcalRoute = new Elysia().get('/events/ical', ({ query }) =>
  EventsController.getIcal(typeof query.token === 'string' ? query.token : null)
);
