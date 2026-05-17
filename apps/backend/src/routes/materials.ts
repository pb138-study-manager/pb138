import { Elysia } from 'elysia';
import { z } from 'zod';
import { db } from '../db';
import { studyMaterials, courses} from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull } from 'drizzle-orm';
import { zodBody } from '../lib/validation';

const CreateMaterialSchema = z.object({
  title: z.string().min(1),
  url: z.string().url().optional(),
  description: z.string().optional(),
});

export const materialsRoutes = new Elysia({ prefix: '/courses' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/:id/materials', async ({ params, set }) => {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    return db
      .select()
      .from(studyMaterials)
      .where(and(eq(studyMaterials.courseId, course.id), isNull(studyMaterials.deletedAt)));
  })
  .post(
    '/:id/materials',
    async ({ params, body, user, set }) => {
      if (!(user as AuthUser).roles.includes('TEACHER')) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'TEACHER role required' };
      }
      const [course] = await db
        .select()
        .from(courses)
        .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
      if (!course) {
        set.status = 404;
        return { error: 'NOT_FOUND', message: 'Course not found' };
      }
      if (course.lectureTeacherId !== (user as AuthUser).id) {
        set.status = 403;
        return { error: 'FORBIDDEN', message: 'Access denied: you do not teach this course' };
      }
      const [material] = await db
        .insert(studyMaterials)
        .values({
          courseId: course.id,
          createdBy: (user as AuthUser).id,
          title: body.title,
          url: body.url,
          description: body.description,
        })
        .returning();
      await logAction(
        db,
        (user as AuthUser).id,
        `Added material ${material.id} to course ${course.id}`
      );
      return material;
    },
    zodBody(CreateMaterialSchema)
  )
  .delete('/:id/materials/:matId', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    if (!authUser.roles.includes('TEACHER')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'TEACHER role required' };
    }
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, Number(params.id)), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    if (course.lectureTeacherId !== authUser.id) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Access denied: you do not teach this course' };
    }
    const [material] = await db
      .select()
      .from(studyMaterials)
      .where(and(eq(studyMaterials.id, Number(params.matId)), isNull(studyMaterials.deletedAt)));
    if (!material) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Material not found' };
    }
    await db
      .update(studyMaterials)
      .set({ deletedAt: new Date() })
      .where(eq(studyMaterials.id, material.id));
    await logAction(db, authUser.id, `Deleted material ${material.id}`);
    return { success: true };
  });
