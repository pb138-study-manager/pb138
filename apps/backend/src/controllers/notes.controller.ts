import { db } from '../db';
import { notes, folders } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull } from 'drizzle-orm';
import { NotFoundError } from '../lib/errors';
import type { CreateNoteInput, UpdateNoteInput } from '../routes/notes';

export async function listNotes(user: AuthUser) {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, user.id), isNull(notes.deletedAt)));
}

export async function createNote(user: AuthUser, body: CreateNoteInput) {
  if (body.folderId !== undefined) {
    const [folder] = await db
      .select()
      .from(folders)
      .where(
        and(eq(folders.id, body.folderId), eq(folders.userId, user.id), isNull(folders.deletedAt))
      );
    if (!folder) throw new NotFoundError('Folder not found or access denied');
  }
  const [note] = await db
    .insert(notes)
    .values({
      userId: user.id,
      title: body.title,
      description: body.description,
      folderId: body.folderId,
      courseId: body.courseId,
      tags: body.tags ?? [],
    })
    .returning();
  await logAction(db, user.id, `Created note ${note.id}: ${note.title}`);
  return note;
}

export async function getNote(user: AuthUser, id: number) {
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id), isNull(notes.deletedAt)));
  if (!note) throw new NotFoundError('Note not found or access denied');
  return note;
}

export async function updateNote(user: AuthUser, id: number, body: UpdateNoteInput) {
  const [existing] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id), isNull(notes.deletedAt)));
  if (!existing) throw new NotFoundError('Note not found or access denied');

  if (body.folderId !== undefined && body.folderId !== null) {
    const [folder] = await db
      .select()
      .from(folders)
      .where(
        and(eq(folders.id, body.folderId), eq(folders.userId, user.id), isNull(folders.deletedAt))
      );
    if (!folder) throw new NotFoundError('Folder not found or access denied');
  }

  const [updated] = await db
    .update(notes)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.folderId !== undefined && { folderId: body.folderId }),
      ...(body.courseId !== undefined && { courseId: body.courseId }),
      ...(body.tags !== undefined && { tags: body.tags }),
    })
    .where(eq(notes.id, existing.id))
    .returning();
  await logAction(db, user.id, `Updated note ${existing.id}`);
  return updated;
}

export async function deleteNote(user: AuthUser, id: number) {
  const [existing] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id), isNull(notes.deletedAt)));
  if (!existing) throw new NotFoundError('Note not found or access denied');

  await db.update(notes).set({ deletedAt: new Date() }).where(eq(notes.id, existing.id));
  await logAction(db, user.id, `Deleted note ${existing.id}`);
  return { success: true };
}
