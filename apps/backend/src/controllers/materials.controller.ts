import { db } from '../db';
import { studyMaterials, courses } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, BadRequestError, UploadError } from '../lib/errors';
import { uploadFile, getSignedUrl, deleteFile, COURSE_MATERIALS_BUCKET } from '../services/storage';
import { createRequire } from 'module';
import type { CreateMaterialInput } from '../routes/materials';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

async function requireCourse(courseId: number) {
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
  if (!course) throw new NotFoundError('Course not found');
  return course;
}

export async function listMaterials(courseId: number) {
  const course = await requireCourse(courseId);
  return db
    .select()
    .from(studyMaterials)
    .where(and(eq(studyMaterials.courseId, course.id), isNull(studyMaterials.deletedAt)));
}

export async function createMaterial(user: AuthUser, courseId: number, body: CreateMaterialInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id)
    throw new ForbiddenError('Access denied: you do not teach this course');

  const [material] = await db
    .insert(studyMaterials)
    .values({ courseId: course.id, createdBy: user.id, title: body.title, url: body.url, description: body.description })
    .returning();
  await logAction(db, user.id, `Added material ${material.id} to course ${course.id}`);
  return material;
}

export async function uploadMaterial(user: AuthUser, courseId: number, request: Request) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id)
    throw new ForbiddenError('Access denied: you do not teach this course');

  const formData = await request.formData();
  const file = formData.get('file');
  const title = (formData.get('title') as string | null)?.trim();
  const description = (formData.get('description') as string | null)?.trim() || null;

  if (!file || !(file instanceof File) || !title)
    throw new BadRequestError('title and file are required');

  const storagePath = `course-${course.id}/${crypto.randomUUID()}-${file.name}`;
  try {
    await uploadFile(COURSE_MATERIALS_BUCKET, storagePath, file);
  } catch (e) {
    throw new UploadError((e as Error).message);
  }

  const [material] = await db
    .insert(studyMaterials)
    .values({ courseId: course.id, createdBy: user.id, title, description, storagePath })
    .returning();
  await logAction(db, user.id, `Uploaded file material ${material.id} to course ${course.id}`);
  return material;
}

export async function downloadMaterial(user: AuthUser, courseId: number, matId: number) {
  const [material] = await db
    .select()
    .from(studyMaterials)
    .where(and(eq(studyMaterials.id, matId), isNull(studyMaterials.deletedAt)));
  if (!material) throw new NotFoundError('Material not found');
  if (!material.storagePath) throw new BadRequestError('Material has no uploaded file');

  await requireCourse(courseId);
  try {
    const url = await getSignedUrl(COURSE_MATERIALS_BUCKET, material.storagePath);
    await logAction(db, user.id, `Downloaded material ${material.id} from course ${courseId}`);
    return { url };
  } catch (e) {
    throw new UploadError((e as Error).message);
  }
}

export async function deleteMaterial(user: AuthUser, courseId: number, matId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id)
    throw new ForbiddenError('Access denied: you do not teach this course');

  const [material] = await db
    .select()
    .from(studyMaterials)
    .where(and(eq(studyMaterials.id, matId), isNull(studyMaterials.deletedAt)));
  if (!material) throw new NotFoundError('Material not found');

  if (material.storagePath)
    await deleteFile(COURSE_MATERIALS_BUCKET, material.storagePath).catch(() => {});

  await db.update(studyMaterials).set({ deletedAt: new Date() }).where(eq(studyMaterials.id, material.id));
  await logAction(db, user.id, `Deleted material ${material.id}`);
  return { success: true };
}

export async function getMaterialContent(matId: number) {
  const [material] = await db
    .select()
    .from(studyMaterials)
    .where(and(eq(studyMaterials.id, matId), isNull(studyMaterials.deletedAt)));
  if (!material) throw new NotFoundError('Material not found');
  if (!material.url) throw new BadRequestError('Material has no URL to fetch');

  const res = await fetch(material.url);
  if (!res.ok) throw new UploadError(`Could not fetch material URL: ${res.status}`);

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('pdf')) return { text: (await res.text()).slice(0, 8000) };

  const buffer = Buffer.from(await res.arrayBuffer());
  const parsed = await pdfParse(buffer);
  const text = parsed.text.trim();
  if (!text) throw new BadRequestError('PDF appears to be scanned (image-only), cannot extract text');
  return { text: text.slice(0, 8000) };
}