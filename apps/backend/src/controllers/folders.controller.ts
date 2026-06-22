import { db } from '../db';
import { folders, notes } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull } from 'drizzle-orm';
import { NotFoundError } from '../lib/errors';
import type { CreateFolderInput, UpdateFolderInput } from '../routes/folders';

export async function listFolders(user: AuthUser) {
  return db
    .select()
    .from(folders)
    .where(and(eq(folders.userId, user.id), isNull(folders.deletedAt)));
}

export async function createFolder(user: AuthUser, body: CreateFolderInput) {
  const [folder] = await db
    .insert(folders)
    .values({ userId: user.id, name: body.name, tags: body.tags ?? [] })
    .returning();
  await logAction(db, user.id, `Created folder ${folder.id}: ${folder.name}`);
  return folder;
}

export async function updateFolder(user: AuthUser, id: number, body: UpdateFolderInput) {
  const [existing] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.userId, user.id), isNull(folders.deletedAt)));
  if (!existing) throw new NotFoundError('Folder not found or access denied');

  const [updated] = await db
    .update(folders)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.tags !== undefined && { tags: body.tags }),
    })
    .where(eq(folders.id, existing.id))
    .returning();
  await logAction(db, user.id, `Updated folder ${existing.id}`);
  return updated;
}

export async function deleteFolder(user: AuthUser, id: number) {
  const [existing] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.userId, user.id), isNull(folders.deletedAt)));
  if (!existing) throw new NotFoundError('Folder not found or access denied');

  await db
    .update(notes)
    .set({ folderId: null })
    .where(and(eq(notes.folderId, existing.id), eq(notes.userId, user.id)));
  await db.update(folders).set({ deletedAt: new Date() }).where(eq(folders.id, existing.id));
  await logAction(db, user.id, `Deleted folder ${existing.id}`);
  return { success: true };
}
