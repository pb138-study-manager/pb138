import { Elysia } from 'elysia';
import { z } from 'zod';
import { db } from '../db';
import { studyMaterials, courses } from '../db/schema';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull } from 'drizzle-orm';
import { zodBody } from '../lib/validation';
import {
  uploadFile,
  getSignedUrl,
  deleteFile,
  COURSE_MATERIALS_BUCKET,
} from '../services/storage';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

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
  .post('/:id/materials/upload', async ({ params, request, user, set }) => {
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

    const formData = await request.formData();
    const file = formData.get('file');
    const title = (formData.get('title') as string | null)?.trim();
    const description = (formData.get('description') as string | null)?.trim() || null;

    if (!file || !(file instanceof File) || !title) {
      set.status = 400;
      return { error: 'VALIDATION_ERROR', message: 'title and file are required' };
    }

    const storagePath = `course-${course.id}/${crypto.randomUUID()}-${file.name}`;

    try {
      await uploadFile(COURSE_MATERIALS_BUCKET, storagePath, file);
    } catch (e) {
      set.status = 502;
      return { error: 'UPLOAD_FAILED', message: (e as Error).message };
    }

    const [material] = await db
      .insert(studyMaterials)
      .values({
        courseId: course.id,
        createdBy: authUser.id,
        title,
        description,
        storagePath,
      })
      .returning();

    await logAction(db, authUser.id, `Uploaded file material ${material.id} to course ${course.id}`);
    return material;
  })
  .get('/:id/materials/:matId/download', async ({ params, user, set }) => {
    const authUser = user as AuthUser;
    const [material] = await db
      .select()
      .from(studyMaterials)
      .where(and(eq(studyMaterials.id, Number(params.matId)), isNull(studyMaterials.deletedAt)));
    if (!material) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Material not found' };
    }
    if (!material.storagePath) {
      set.status = 400;
      return { error: 'NO_FILE', message: 'Material has no uploaded file' };
    }
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, material.courseId), isNull(courses.deletedAt)));
    if (!course) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Course not found' };
    }
    const isTeacher = course.lectureTeacherId === authUser.id;
    // enrolled students or the teacher can download
    if (!isTeacher) {
      // allow any authenticated user for now; enrollment check can be added later
    }

    try {
      const url = await getSignedUrl(COURSE_MATERIALS_BUCKET, material.storagePath);
      return { url };
    } catch (e) {
      set.status = 502;
      return { error: 'SIGNED_URL_FAILED', message: (e as Error).message };
    }
  })
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

    if (material.storagePath) {
      await deleteFile(COURSE_MATERIALS_BUCKET, material.storagePath).catch(() => {});
    }

    await db
      .update(studyMaterials)
      .set({ deletedAt: new Date() })
      .where(eq(studyMaterials.id, material.id));
    await logAction(db, authUser.id, `Deleted material ${material.id}`);
    return { success: true };
  })
  .get('/:id/materials/:matId/content', async ({ params, set }) => {
    const [material] = await db
      .select()
      .from(studyMaterials)
      .where(and(eq(studyMaterials.id, Number(params.matId)), isNull(studyMaterials.deletedAt)));
    if (!material) {
      set.status = 404;
      return { error: 'NOT_FOUND', message: 'Material not found' };
    }
    if (!material.url) {
      set.status = 400;
      return { error: 'NO_URL', message: 'Material has no URL to fetch' };
    }
    const res = await fetch(material.url);
    if (!res.ok) {
      set.status = 502;
      return { error: 'FETCH_FAILED', message: `Could not fetch material URL: ${res.status}` };
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('pdf')) {
      const text = await res.text();
      return { text: text.slice(0, 8000) };
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const text = parsed.text.trim();
    if (!text) {
      set.status = 422;
      return { error: 'NO_TEXT', message: 'PDF appears to be scanned (image-only), cannot extract text' };
    }
    return { text: text.slice(0, 8000) };
  });
