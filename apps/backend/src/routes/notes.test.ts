import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../db';
import { notes, folders, users, auditLogs } from '../db/schema';
import { notesRoutes } from './notes';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';

const TEST_SECRET = 'notes-test-jwt-secret';
const TEST_AUTH_ID = 'notes-test-supabase-uuid';
process.env.SUPABASE_JWT_SECRET = TEST_SECRET;

async function makeAuthHeader(): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  const token = await new SignJWT({ sub: TEST_AUTH_ID })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
  return `Bearer ${token}`;
}

let testUserId: number;
let testApp: Elysia;
let authHeader: string;

async function req(url: string, init: RequestInit = {}): Promise<Request> {
  return new Request(url, {
    ...init,
    headers: { Authorization: authHeader, ...init.headers },
  });
}

beforeAll(async () => {
  authHeader = await makeAuthHeader();
  const [user] = await db
    .insert(users)
    .values({
      email: 'notes-test@example.com',
      login: 'notes-test-user',
      pwdHash: '',
      authId: TEST_AUTH_ID,
    })
    .returning();
  testUserId = user.id;

  testApp = new Elysia().use(notesRoutes);
});

afterAll(async () => {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, testUserId));
  await db.delete(notes).where(eq(notes.userId, testUserId));
  await db.delete(folders).where(eq(folders.userId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));
});

describe('GET /notes', () => {
  it('returns empty array when user has no notes', async () => {
    const res = await testApp.handle(await req('http://localhost/notes'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  it('returns notes belonging to the user', async () => {
    await db.insert(notes).values({
      userId: testUserId,
      title: 'My first note',
    });
    const res = await testApp.handle(await req('http://localhost/notes'));
    const body = await res.json();
    expect(body.some((n: { title: string }) => n.title === 'My first note')).toBe(true);
  });
});

describe('POST /notes', () => {
  it('creates a note with title only (description should be null)', async () => {
    const res = await testApp.handle(
      await req('http://localhost/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Title only note' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Title only note');
    expect(body.description).toBeNull();
    expect(body.userId).toBe(testUserId);
  });

  it('creates a note with description', async () => {
    const res = await testApp.handle(
      await req('http://localhost/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Note with desc', description: 'Some details here' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Note with desc');
    expect(body.description).toBe('Some details here');
  });

  it('returns 400 when title is missing', async () => {
    const res = await testApp.handle(
      await req('http://localhost/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'No title here' }),
      })
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /notes/:id', () => {
  let noteId: number;

  beforeAll(async () => {
    const [note] = await db
      .insert(notes)
      .values({
        userId: testUserId,
        title: 'Detail note',
        description: 'Detail description',
      })
      .returning();
    noteId = note.id;
  });

  it('returns the note by id', async () => {
    const res = await testApp.handle(await req(`http://localhost/notes/${noteId}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(noteId);
    expect(body.title).toBe('Detail note');
  });

  it('returns 404 for unknown id', async () => {
    const res = await testApp.handle(await req('http://localhost/notes/999999'));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /notes/:id', () => {
  let noteId: number;

  beforeAll(async () => {
    const [note] = await db
      .insert(notes)
      .values({
        userId: testUserId,
        title: 'Note to update',
        description: 'Original description',
      })
      .returning();
    noteId = note.id;
  });

  it('updates the title', async () => {
    const res = await testApp.handle(
      await req(`http://localhost/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated note title' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Updated note title');
  });

  it('updates the description', async () => {
    const res = await testApp.handle(
      await req(`http://localhost/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Updated description' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description).toBe('Updated description');
  });

  it('returns 404 when note does not belong to user', async () => {
    const res = await testApp.handle(
      await req('http://localhost/notes/999999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hacked' }),
      })
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /notes/:id', () => {
  let noteId: number;

  beforeAll(async () => {
    const [note] = await db
      .insert(notes)
      .values({
        userId: testUserId,
        title: 'Note to delete',
      })
      .returning();
    noteId = note.id;
  });

  it('soft-deletes the note and removes it from list', async () => {
    const res = await testApp.handle(
      await req(`http://localhost/notes/${noteId}`, { method: 'DELETE' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const listRes = await testApp.handle(await req('http://localhost/notes'));
    const list = await listRes.json();
    expect(list.some((n: { id: number }) => n.id === noteId)).toBe(false);
  });

  it('returns 404 for already-deleted note', async () => {
    const res = await testApp.handle(
      await req(`http://localhost/notes/${noteId}`, { method: 'DELETE' })
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 when note does not belong to user', async () => {
    const res = await testApp.handle(
      await req('http://localhost/notes/999999', { method: 'DELETE' })
    );
    expect(res.status).toBe(404);
  });
});
