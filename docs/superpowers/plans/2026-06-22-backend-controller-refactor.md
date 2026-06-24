# Backend Controller Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the backend from single-file routes into a 2-layer architecture (routes + controllers) so each file has one clear responsibility.

**Architecture:** `routes/` stays thin — Elysia setup, Zod schemas, wire to controllers. `controllers/` holds all DB queries and business logic as plain async functions. Errors are thrown using custom classes from `lib/errors.ts` and caught by a global `onError` handler in `index.ts`.

**Tech Stack:** Bun, ElysiaJS, Drizzle ORM, Zod, TypeScript strict

---

## File Map

**New files:**
- `src/lib/errors.ts`
- `src/controllers/auth.controller.ts`
- `src/controllers/search.controller.ts`
- `src/controllers/folders.controller.ts`
- `src/controllers/notes.controller.ts`
- `src/controllers/events.controller.ts`
- `src/controllers/materials.controller.ts`
- `src/controllers/admin.controller.ts`
- `src/controllers/groups.controller.ts`
- `src/controllers/tasks.controller.ts`
- `src/controllers/users.controller.ts`
- `src/controllers/ai.controller.ts`
- `src/controllers/courses.controller.ts`

**Modified files:**
- `src/index.ts` — add global `onError` handler
- `src/routes/auth.ts` — thin shell
- `src/routes/search.ts` — thin shell
- `src/routes/folders.ts` — thin shell
- `src/routes/notes.ts` — thin shell
- `src/routes/events.ts` — thin shell
- `src/routes/materials.ts` — thin shell
- `src/routes/admin.ts` — thin shell
- `src/routes/groups.ts` — thin shell
- `src/routes/tasks.ts` — thin shell
- `src/routes/users.ts` — thin shell
- `src/routes/ai.ts` — thin shell
- `src/routes/courses.ts` — thin shell

---

## Task 1: Create `lib/errors.ts` and wire `onError` in `index.ts`

**Files:**
- Create: `apps/backend/src/lib/errors.ts`
- Modify: `apps/backend/src/index.ts`

- [ ] **Step 1: Create `src/lib/errors.ts`**

```ts
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Invalid or missing token') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(403, 'FORBIDDEN', message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, 'BAD_REQUEST', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Max 10 AI requests per minute') {
    super(429, 'RATE_LIMITED', message);
  }
}

export class InternalError extends AppError {
  constructor(message: string) {
    super(500, 'INTERNAL_ERROR', message);
  }
}

export class UploadError extends AppError {
  constructor(message: string) {
    super(502, 'UPLOAD_FAILED', message);
  }
}
```

- [ ] **Step 2: Add `onError` to `src/index.ts`**

Replace the entire `src/index.ts` with:

```ts
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { tasksRoutes } from './routes/tasks';
import { eventsRoutes, eventsIcalRoute } from './routes/events';
import { foldersRoutes } from './routes/folders';
import { notesRoutes } from './routes/notes';
import { coursesRoutes } from './routes/courses';
import { usersRoutes } from './routes/users';
import { groupsRoutes } from './routes/groups';
import { materialsRoutes } from './routes/materials';
import { adminRoutes } from './routes/admin';
import { aiRoutes } from './routes/ai';
import { searchRoutes } from './routes/search';
import { AppError } from './lib/errors';

const PORT = process.env.PORT ?? 3001;

const app = new Elysia()
  .use(cors())
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.status;
      return { error: error.code, message: error.message };
    }
    set.status = 500;
    return { error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' };
  })
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))
  .use(authRoutes)
  .use(eventsIcalRoute)
  .group('', (app) =>
    app
      .use(authMiddleware)
      .use(tasksRoutes)
      .use(eventsRoutes)
      .use(foldersRoutes)
      .use(notesRoutes)
      .use(coursesRoutes)
      .use(usersRoutes)
      .use(groupsRoutes)
      .use(materialsRoutes)
      .use(adminRoutes)
      .use(aiRoutes)
      .use(searchRoutes)
  )
  .listen(PORT);

console.log(`Backend running at http://localhost:${PORT}`);
export type App = typeof app;
```

- [ ] **Step 3: Run tests to confirm nothing broke**

```bash
cd apps/backend && bun test
```

Expected: all tests pass (no logic changed yet)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/lib/errors.ts apps/backend/src/index.ts
git commit -m "feat: add AppError classes and global onError handler"
```

---

## Task 2: Migrate `auth`

**Files:**
- Create: `apps/backend/src/controllers/auth.controller.ts`
- Modify: `apps/backend/src/routes/auth.ts`

- [ ] **Step 1: Create `src/controllers/auth.controller.ts`**

```ts
import { db } from '../db';
import { users, userProfiles, roles, userRoles } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { eq } from 'drizzle-orm';

type NewUser = typeof users.$inferInsert;

export async function syncUser(body: { email: string; authId: string; fullName?: string }) {
  const { email, authId, fullName } = body;

  const existing = await db.select().from(users).where(eq(users.authId, authId));
  if (existing.length > 0) return existing[0];

  const login = email.split('@')[0] + '_' + authId.substring(0, 4);
  const newUserData: NewUser = { email, login, pwdHash: '', authId };
  const [newUser] = await db.insert(users).values(newUserData).returning();

  await db.insert(userProfiles).values({ userId: newUser.id, name: fullName || null });

  const [userRole] = await db.select().from(roles).where(eq(roles.name, 'USER'));
  if (userRole) {
    await db.insert(userRoles).values({ userId: newUser.id, roleId: userRole.id });
  }

  return newUser;
}

export async function logout(user: AuthUser) {
  await db.update(users).set({ activeSession: false }).where(eq(users.id, user.id));
  return { success: true, message: 'Logged out successfully' };
}
```

- [ ] **Step 2: Rewrite `src/routes/auth.ts`**

```ts
import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as AuthController from '../controllers/auth.controller';

const SyncBodySchema = z.object({
  email: z.string().email(),
  authId: z.string(),
  fullName: z.string().optional(),
});

export type SyncBodyInput = z.infer<typeof SyncBodySchema>;

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/sync', ({ body }) => AuthController.syncUser(body), zodBody(SyncBodySchema))
  .use(authMiddleware)
  .post('/logout', ({ user }) => AuthController.logout(user as AuthUser));
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && bun test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/controllers/auth.controller.ts apps/backend/src/routes/auth.ts
git commit -m "refactor: extract auth controller"
```

---

## Task 3: Migrate `search`

**Files:**
- Create: `apps/backend/src/controllers/search.controller.ts`
- Modify: `apps/backend/src/routes/search.ts`

- [ ] **Step 1: Create `src/controllers/search.controller.ts`**

```ts
import { db } from '../db';
import { tasks, notes, events, courses, userCourses } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { eq, and, isNull, ilike, or } from 'drizzle-orm';

export async function search(user: AuthUser, q: string) {
  if (!q.trim()) return { tasks: [], notes: [], events: [], courses: [] };

  const pattern = `%${q}%`;

  const [userTasks, userNotes, userEvents, userCoursesList] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, user.id),
          isNull(tasks.deletedAt),
          or(ilike(tasks.title, pattern), ilike(tasks.description, pattern))
        )
      )
      .limit(10),
    db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.userId, user.id),
          isNull(notes.deletedAt),
          or(ilike(notes.title, pattern), ilike(notes.description, pattern))
        )
      )
      .limit(10),
    db
      .select()
      .from(events)
      .where(
        and(eq(events.userId, user.id), isNull(events.deletedAt), ilike(events.title, pattern))
      )
      .limit(10),
    db
      .select({ id: courses.id, name: courses.name, code: courses.code })
      .from(courses)
      .innerJoin(userCourses, eq(userCourses.courseId, courses.id))
      .where(
        and(
          eq(userCourses.userId, user.id),
          isNull(courses.deletedAt),
          or(ilike(courses.name, pattern), ilike(courses.code, pattern))
        )
      )
      .limit(10),
  ]);

  return { tasks: userTasks, notes: userNotes, events: userEvents, courses: userCoursesList };
}
```

- [ ] **Step 2: Rewrite `src/routes/search.ts`**

```ts
import { Elysia } from 'elysia';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import * as SearchController from '../controllers/search.controller';

export const searchRoutes = new Elysia({ prefix: '/search' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', ({ user, query }) =>
    SearchController.search(user as AuthUser, String(query.q ?? ''))
  );
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && bun test
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/controllers/search.controller.ts apps/backend/src/routes/search.ts
git commit -m "refactor: extract search controller"
```

---

## Task 4: Migrate `folders`

**Files:**
- Create: `apps/backend/src/controllers/folders.controller.ts`
- Modify: `apps/backend/src/routes/folders.ts`

- [ ] **Step 1: Create `src/controllers/folders.controller.ts`**

```ts
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
```

- [ ] **Step 2: Rewrite `src/routes/folders.ts`**

```ts
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
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && bun test
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/controllers/folders.controller.ts apps/backend/src/routes/folders.ts
git commit -m "refactor: extract folders controller"
```

---

## Task 5: Migrate `notes`

**Files:**
- Create: `apps/backend/src/controllers/notes.controller.ts`
- Modify: `apps/backend/src/routes/notes.ts`

- [ ] **Step 1: Create `src/controllers/notes.controller.ts`**

```ts
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
```

- [ ] **Step 2: Rewrite `src/routes/notes.ts`**

```ts
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
  .get('/:id', ({ user, params }) =>
    NotesController.getNote(user as AuthUser, Number(params.id))
  )
  .patch(
    '/:id',
    ({ user, params, body }) =>
      NotesController.updateNote(user as AuthUser, Number(params.id), body),
    zodBody(UpdateNoteSchema)
  )
  .delete('/:id', ({ user, params }) =>
    NotesController.deleteNote(user as AuthUser, Number(params.id))
  );
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && bun test
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/controllers/notes.controller.ts apps/backend/src/routes/notes.ts
git commit -m "refactor: extract notes controller"
```

---

## Task 6: Migrate `events`

**Files:**
- Create: `apps/backend/src/controllers/events.controller.ts`
- Modify: `apps/backend/src/routes/events.ts`

- [ ] **Step 1: Create `src/controllers/events.controller.ts`**

```ts
import { db } from '../db';
import { events, tasks, userSettings } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, lt, gt, gte } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../lib/errors';
import type { CreateEventInput, UpdateEventInput } from '../routes/events';

export interface ListEventsQuery {
  from?: string;
  to?: string;
  courseId?: string;
  type?: string;
  upcoming?: string;
}

export async function listEvents(user: AuthUser, query: ListEventsQuery) {
  const conditions = [eq(events.userId, user.id), isNull(events.deletedAt)];
  if (query.from) conditions.push(gt(events.endDate, new Date(query.from)));
  if (query.to) conditions.push(lt(events.startDate, new Date(query.to)));
  if (query.courseId) conditions.push(eq(events.courseId, Number(query.courseId)));
  if (query.type) conditions.push(eq(events.type, query.type as 'EVENT' | 'DEADLINE'));
  if (query.upcoming === 'true') conditions.push(gte(events.startDate, new Date()));

  return db
    .select()
    .from(events)
    .where(and(...conditions));
}

export async function createEvent(user: AuthUser, body: CreateEventInput) {
  if (new Date(body.startDate) > new Date(body.endDate)) {
    throw new BadRequestError('startDate must not be after endDate');
  }
  const [event] = await db
    .insert(events)
    .values({
      userId: user.id,
      title: body.title,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      description: body.description,
      place: body.place,
      type: body.type ?? 'EVENT',
    })
    .returning();
  await logAction(db, user.id, `Created event ${event.id}: ${event.title}`);
  return event;
}

export async function getEvent(user: AuthUser, id: number) {
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, user.id), isNull(events.deletedAt)));
  if (!event) throw new NotFoundError('Event not found or access denied');
  return event;
}

export async function updateEvent(user: AuthUser, id: number, body: UpdateEventInput) {
  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, user.id), isNull(events.deletedAt)));
  if (!existing) throw new NotFoundError('Event not found or access denied');

  const [updated] = await db
    .update(events)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description ?? null }),
      ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
      ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
      ...(body.place !== undefined && { place: body.place }),
      ...(body.type !== undefined && { type: body.type }),
    })
    .where(eq(events.id, existing.id))
    .returning();
  await logAction(db, user.id, `Updated event ${existing.id}`);
  return updated;
}

export async function deleteEvent(user: AuthUser, id: number) {
  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, user.id), isNull(events.deletedAt)));
  if (!existing) throw new NotFoundError('Event not found or access denied');

  await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, existing.id));
  await logAction(db, user.id, `Deleted event ${existing.id}`);
  return { success: true };
}

function fmtIcal(iso: string): string {
  return iso.replace(/[-:.]/g, '').slice(0, 15) + 'Z';
}

function escIcal(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function getIcal(token: string | null): Promise<Response> {
  if (!token) return new Response('Unauthorized', { status: 401 });

  const [settings] = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(eq(userSettings.calendarToken, token));
  if (!settings) return new Response('Unauthorized', { status: 401 });

  const { userId } = settings;
  const userEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.userId, userId), isNull(events.deletedAt)));
  const userTasks = await db
    .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt), isNull(tasks.parentId)));

  const stamp = fmtIcal(new Date().toISOString());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Student OS//StudentOS//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Student OS',
  ];

  for (const ev of userEvents) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:event-${ev.id}@student-os`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${fmtIcal(new Date(ev.startDate).toISOString())}`);
    lines.push(`DTEND:${fmtIcal(new Date(ev.endDate).toISOString())}`);
    lines.push(`SUMMARY:${escIcal(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escIcal(ev.description)}`);
    if (ev.place) lines.push(`LOCATION:${escIcal(ev.place)}`);
    lines.push('END:VEVENT');
  }

  for (const task of userTasks) {
    if (!task.dueDate) continue;
    const dateOnly = new Date(task.dueDate).toISOString().slice(0, 10).replace(/-/g, '');
    const nextDay = new Date(task.dueDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDateOnly = nextDay.toISOString().slice(0, 10).replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:task-${task.id}@student-os`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dateOnly}`);
    lines.push(`DTEND;VALUE=DATE:${nextDateOnly}`);
    lines.push(`SUMMARY:${escIcal(task.title)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="student-os.ics"',
    },
  });
}
```

- [ ] **Step 2: Rewrite `src/routes/events.ts`**

```ts
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
  .get('/:id', ({ user, params }) =>
    EventsController.getEvent(user as AuthUser, Number(params.id))
  )
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
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && bun test
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/controllers/events.controller.ts apps/backend/src/routes/events.ts
git commit -m "refactor: extract events controller"
```

---

## Task 7: Migrate `materials`

**Files:**
- Create: `apps/backend/src/controllers/materials.controller.ts`
- Modify: `apps/backend/src/routes/materials.ts`

- [ ] **Step 1: Create `src/controllers/materials.controller.ts`**

```ts
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

  if (material.storagePath) {
    await deleteFile(COURSE_MATERIALS_BUCKET, material.storagePath).catch(() => {});
  }
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
  if (!res.ok) {
    const err = new BadRequestError(`Could not fetch material URL: ${res.status}`);
    (err as unknown as { status: number }).status = 502;
    (err as unknown as { code: string }).code = 'FETCH_FAILED';
    throw err;
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
    const err = new BadRequestError('PDF appears to be scanned (image-only), cannot extract text');
    (err as unknown as { status: number }).status = 422;
    (err as unknown as { code: string }).code = 'NO_TEXT';
    throw err;
  }
  return { text: text.slice(0, 8000) };
}
```

- [ ] **Step 2: Rewrite `src/routes/materials.ts`**

```ts
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
    ({ user, params, body }) =>
      MaterialsController.createMaterial(user as AuthUser, Number(params.id), body),
    zodBody(CreateMaterialSchema)
  )
  .post('/:id/materials/upload', ({ user, params, request }) =>
    MaterialsController.uploadMaterial(user as AuthUser, Number(params.id), request)
  )
  .get('/:id/materials/:matId/download', ({ user, params }) =>
    MaterialsController.downloadMaterial(user as AuthUser, Number(params.id), Number(params.matId))
  )
  .delete('/:id/materials/:matId', ({ user, params }) =>
    MaterialsController.deleteMaterial(user as AuthUser, Number(params.id), Number(params.matId))
  )
  .get('/:id/materials/:matId/content', ({ params }) =>
    MaterialsController.getMaterialContent(Number(params.matId))
  );
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && bun test
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/controllers/materials.controller.ts apps/backend/src/routes/materials.ts
git commit -m "refactor: extract materials controller"
```

---

## Task 8: Migrate `admin`

**Files:**
- Create: `apps/backend/src/controllers/admin.controller.ts`
- Modify: `apps/backend/src/routes/admin.ts`

- [ ] **Step 1: Create `src/controllers/admin.controller.ts`**

```ts
import { db } from '../db';
import {
  users, userProfiles, roles, userRoles, permissions, rolePermissions,
  auditLogs, tasks, events, notes, folders,
} from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import {
  eq, and, isNull, isNotNull, ilike, notIlike, inArray, desc, or, gte, lte, count,
} from 'drizzle-orm';
import { NotFoundError, BadRequestError, ConflictError } from '../lib/errors';
import type { PatchRolesInput, ReactivateInput } from '../routes/admin';

export async function listUsers(query: {
  q?: string; activeOnly?: string; limit?: string; offset?: string;
}) {
  const q = (query.q ?? '').trim();
  const activeOnly = query.activeOnly === 'true';
  const limit = Math.min(Number(query.limit ?? 50) || 50, 200);
  const offset = Math.max(0, Number(query.offset ?? 0) || 0);

  const conditions: ReturnType<typeof ilike>[] = [];
  if (q) conditions.push(or(ilike(users.login, `%${q}%`), ilike(users.email, `%${q}%`)) as ReturnType<typeof ilike>);
  if (activeOnly) conditions.push(isNull(users.deletedAt) as unknown as ReturnType<typeof ilike>);

  const allUsers = await db
    .select({ id: users.id, login: users.login, email: users.email, name: userProfiles.name, deletedAt: users.deletedAt })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(limit)
    .offset(offset);

  if (allUsers.length === 0) return [];

  const userIds = allUsers.map((u) => u.id);
  const allUserRoles = await db
    .select({ userId: userRoles.userId, roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(inArray(userRoles.userId, userIds));

  const rolesByUserId = new Map<number, string[]>();
  for (const { userId, roleName } of allUserRoles) {
    const existing = rolesByUserId.get(userId) ?? [];
    existing.push(roleName);
    rolesByUserId.set(userId, existing);
  }

  return allUsers.map((u) => ({
    ...u,
    deletedAt: u.deletedAt?.toISOString() ?? null,
    roles: rolesByUserId.get(u.id) ?? [],
  }));
}

export async function patchUserRoles(actor: AuthUser, targetId: number, body: PatchRolesInput) {
  if (isNaN(targetId)) throw new BadRequestError('Invalid user id');

  const [target] = await db
    .select({ id: users.id, login: users.login })
    .from(users)
    .where(and(eq(users.id, targetId), isNull(users.deletedAt)));
  if (!target) throw new NotFoundError('User not found');

  const allRoles = await db.select().from(roles);
  const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r.id]));

  const added: string[] = [];
  const removed: string[] = [];

  for (const roleName of body.add ?? []) {
    const roleId = roleMap[roleName];
    if (roleId) {
      await db.insert(userRoles).values({ userId: targetId, roleId }).onConflictDoNothing();
      added.push(roleName);
    }
  }

  for (const roleName of body.remove ?? []) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;

    if (roleName === 'ADMIN') {
      const [{ adminCount }] = await db
        .select({ adminCount: count() })
        .from(userRoles)
        .innerJoin(users, and(eq(userRoles.userId, users.id), isNull(users.deletedAt)))
        .where(eq(userRoles.roleId, roleId));
      if (adminCount <= 1) throw new ConflictError('Cannot remove the last admin role');
    }

    await db.delete(userRoles).where(and(eq(userRoles.userId, targetId), eq(userRoles.roleId, roleId)));
    removed.push(roleName);
  }

  const parts: string[] = [];
  if (added.length) parts.push(`added ${added.join(', ')}`);
  if (removed.length) parts.push(`removed ${removed.join(', ')}`);
  const detail = parts.length ? `: ${parts.join('; ')}` : '';
  await logAction(db, actor.id, `Admin updated roles for user ${targetId} (${target.login})${detail}`);

  const updatedRoles = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, targetId));

  return { userId: targetId, roles: updatedRoles.map((r) => r.roleName) };
}

export async function deactivateUser(actor: AuthUser, targetId: number) {
  if (isNaN(targetId)) throw new BadRequestError('Invalid user id');
  if (targetId === actor.id) throw new ConflictError('You cannot deactivate your own account');

  const [target] = await db
    .select({ id: users.id, login: users.login })
    .from(users)
    .where(and(eq(users.id, targetId), isNull(users.deletedAt)));
  if (!target) throw new NotFoundError('User not found or already deactivated');

  const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'ADMIN'));
  if (adminRole) {
    const [targetAdminRow] = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, targetId), eq(userRoles.roleId, adminRole.id)));
    if (targetAdminRow) {
      const [{ adminCount }] = await db
        .select({ adminCount: count() })
        .from(userRoles)
        .innerJoin(users, and(eq(userRoles.userId, users.id), isNull(users.deletedAt)))
        .where(eq(userRoles.roleId, adminRole.id));
      if (adminCount <= 1) throw new ConflictError('Cannot deactivate the last admin');
    }
  }

  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, targetId));
  await logAction(db, actor.id, `Admin deactivated user ${targetId} (${target.login})`);
  return { success: true };
}

export async function reactivateUser(actor: AuthUser, targetId: number, body: ReactivateInput) {
  if (isNaN(targetId)) throw new BadRequestError('Invalid user id');

  const [target] = await db
    .select({ id: users.id, login: users.login })
    .from(users)
    .where(and(eq(users.id, targetId), isNotNull(users.deletedAt)));
  if (!target) throw new NotFoundError('User not found or already active');

  await db.update(users).set({ deletedAt: null }).where(eq(users.id, targetId));

  if (body.restoreData) {
    await db.update(tasks).set({ deletedAt: null }).where(eq(tasks.userId, targetId));
    await db.update(events).set({ deletedAt: null }).where(eq(events.userId, targetId));
    await db.update(notes).set({ deletedAt: null }).where(eq(notes.userId, targetId));
    await db.update(folders).set({ deletedAt: null }).where(eq(folders.userId, targetId));
  }

  const suffix = body.restoreData ? ' with data restore' : '';
  await logAction(db, actor.id, `Admin reactivated user ${targetId} (${target.login})${suffix}`);
  return { success: true };
}

export async function listAuditLogs(query: {
  q?: string; actor?: string; from?: string; to?: string; type?: string;
  limit?: string; offset?: string;
}) {
  const q = (query.q ?? '').trim();
  const actor = (query.actor ?? '').trim();
  const type = query.type ?? 'all';
  const limit = Math.min(Number(query.limit ?? 50) || 50, 200);
  const offset = Math.max(0, Number(query.offset ?? 0) || 0);

  const conditions = [];
  if (q) conditions.push(ilike(auditLogs.description, `%${q}%`));
  if (actor) conditions.push(ilike(users.login, `%${actor}%`));
  if (query.from) conditions.push(gte(auditLogs.happenedAt, new Date(query.from)));
  if (query.to) conditions.push(lte(auditLogs.happenedAt, new Date(query.to)));
  if (type === 'admin') conditions.push(ilike(auditLogs.description, 'Admin %'));
  if (type === 'user') conditions.push(notIlike(auditLogs.description, 'Admin %'));

  const rows = await db
    .select({
      id: auditLogs.id, actorId: auditLogs.actorId, actorLogin: users.login,
      description: auditLogs.description, happenedAt: auditLogs.happenedAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.happenedAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({ ...r, happenedAt: r.happenedAt.toISOString() }));
}

export async function listRoles() {
  const allRoles = await db.select().from(roles);
  const allRolePerms = await db
    .select({ roleId: rolePermissions.roleId, permName: permissions.name })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

  const permsByRoleId = new Map<number, string[]>();
  for (const { roleId, permName } of allRolePerms) {
    const existing = permsByRoleId.get(roleId) ?? [];
    existing.push(permName);
    permsByRoleId.set(roleId, existing);
  }

  return allRoles.map((r) => ({ id: r.id, name: r.name, permissions: permsByRoleId.get(r.id) ?? [] }));
}
```

- [ ] **Step 2: Rewrite `src/routes/admin.ts`**

```ts
import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as AdminController from '../controllers/admin.controller';

const PatchRolesSchema = z.object({
  add: z.array(z.enum(['USER', 'ADMIN', 'TEACHER'])).optional(),
  remove: z.array(z.enum(['USER', 'ADMIN', 'TEACHER'])).optional(),
});

const ReactivateSchema = z.object({
  restoreData: z.boolean().optional(),
});

export type PatchRolesInput = z.infer<typeof PatchRolesSchema>;
export type ReactivateInput = z.infer<typeof ReactivateSchema>;

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
    if (!(user as AuthUser).roles.includes('ADMIN')) {
      set.status = 403;
      return { error: 'FORBIDDEN', message: 'Admin access required' };
    }
  })
  .get('/users', ({ query }) => AdminController.listUsers(query))
  .patch(
    '/users/:id/roles',
    ({ user, params, body }) =>
      AdminController.patchUserRoles(user as AuthUser, Number(params.id), body),
    zodBody(PatchRolesSchema)
  )
  .delete('/users/:id', ({ user, params }) =>
    AdminController.deactivateUser(user as AuthUser, Number(params.id))
  )
  .post(
    '/users/:id/reactivate',
    ({ user, params, body }) =>
      AdminController.reactivateUser(user as AuthUser, Number(params.id), body),
    zodBody(ReactivateSchema)
  )
  .get('/audit-logs', ({ query }) => AdminController.listAuditLogs(query))
  .get('/roles', () => AdminController.listRoles());
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && bun test
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/controllers/admin.controller.ts apps/backend/src/routes/admin.ts
git commit -m "refactor: extract admin controller"
```

---

## Task 9: Migrate `groups`

**Files:**
- Create: `apps/backend/src/controllers/groups.controller.ts`
- Modify: `apps/backend/src/routes/groups.ts`

- [ ] **Step 1: Create `src/controllers/groups.controller.ts`**

```ts
import { db } from '../db';
import { groups, groupMembers, users, assignments, tasks, events } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, inArray, or } from 'drizzle-orm';
import { NotFoundError, BadRequestError, ForbiddenError } from '../lib/errors';
import type { CreateGroupInput, AddMembersInput, CreateAssignmentInput } from '../routes/groups';

export async function listGroups(user: AuthUser) {
  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id));
  const memberGroupIds = memberRows.map((r) => r.groupId);

  return db
    .select({ id: groups.id, name: groups.name, type: groups.type, mentorId: groups.mentorId, deletedAt: groups.deletedAt })
    .from(groups)
    .where(
      and(
        isNull(groups.deletedAt),
        memberGroupIds.length > 0
          ? or(eq(groups.mentorId, user.id), inArray(groups.id, memberGroupIds))
          : eq(groups.mentorId, user.id)
      )
    );
}

export async function createGroup(user: AuthUser, body: CreateGroupInput) {
  const type = user.roles.includes('TEACHER') ? ('SEMINAR' as const) : ('GROUP' as const);
  const [group] = await db
    .insert(groups)
    .values({ name: body.name, mentorId: user.id, type })
    .returning();
  await logAction(db, user.id, `Created group ${group.id}: ${group.name}`);
  return group;
}

export async function getGroup(user: AuthUser, groupId: number) {
  if (isNaN(groupId)) throw new BadRequestError('Invalid group id');

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));
  if (!group) throw new NotFoundError('Group not found');

  if (group.mentorId !== user.id) {
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)));
    if (!membership) throw new ForbiddenError('Access denied');
  }

  const members = await db
    .select({ id: users.id, login: users.login, email: users.email })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(and(eq(groupMembers.groupId, groupId), isNull(users.deletedAt)));

  return { ...group, members };
}

export async function deleteGroup(user: AuthUser, groupId: number) {
  if (isNaN(groupId)) throw new BadRequestError('Invalid group id');

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));
  if (!group) throw new NotFoundError('Group not found');
  if (group.mentorId !== user.id) throw new ForbiddenError('Only the group mentor can delete this group');

  await db.update(groups).set({ deletedAt: new Date() }).where(eq(groups.id, groupId));
  await logAction(db, user.id, `Deleted group ${groupId}`);
  return { success: true };
}

export async function addMembers(user: AuthUser, groupId: number, body: AddMembersInput) {
  if (isNaN(groupId)) throw new BadRequestError('Invalid group id');

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));
  if (!group) throw new NotFoundError('Group not found');
  if (group.mentorId !== user.id) throw new ForbiddenError('Only the group mentor can add members');

  if (body.userIds.length > 0) {
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, body.userIds), isNull(users.deletedAt)));
    if (existingUsers.length !== body.userIds.length)
      throw new BadRequestError('One or more user IDs are invalid');
  }

  await db
    .insert(groupMembers)
    .values(body.userIds.map((memberId) => ({ userId: memberId, groupId })))
    .onConflictDoNothing();
  await logAction(db, user.id, `Added members to group ${groupId}`);
  return { success: true };
}

export async function removeMember(user: AuthUser, groupId: number, targetUserId: number) {
  if (isNaN(groupId) || isNaN(targetUserId)) throw new BadRequestError('Invalid id');

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));
  if (!group) throw new NotFoundError('Group not found');
  if (group.mentorId !== user.id) throw new ForbiddenError('Only the group mentor can remove members');

  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)));
  if (!membership) throw new NotFoundError('User is not a member of this group');

  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)));
  await logAction(db, user.id, `Removed user ${targetUserId} from group ${groupId}`);
  return { success: true };
}

export async function listAssignments(user: AuthUser, groupId: number) {
  if (isNaN(groupId)) throw new BadRequestError('Invalid group id');

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));
  if (!group) throw new NotFoundError('Group not found');

  if (group.mentorId !== user.id) {
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)));
    if (!membership) throw new ForbiddenError('Access denied');
  }

  return db
    .select()
    .from(assignments)
    .where(and(eq(assignments.groupId, groupId), isNull(assignments.deletedAt)));
}

export async function createAssignment(user: AuthUser, groupId: number, body: CreateAssignmentInput) {
  if (isNaN(groupId)) throw new BadRequestError('Invalid group id');

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));
  if (!group) throw new NotFoundError('Group not found');
  if (group.mentorId !== user.id) throw new ForbiddenError('Only the group mentor can create assignments');
  if (isNaN(new Date(body.dueDate).getTime())) throw new BadRequestError('Invalid dueDate format');

  const [assignment] = await db
    .insert(assignments)
    .values({ groupId, title: body.title, description: body.description, dueDate: new Date(body.dueDate) })
    .returning();

  const memberRows = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .innerJoin(users, and(eq(groupMembers.userId, users.id), isNull(users.deletedAt)))
    .where(eq(groupMembers.groupId, groupId));

  if (memberRows.length > 0) {
    await db.insert(tasks).values(
      memberRows.map((m) => ({
        userId: m.userId,
        assignmentId: assignment.id,
        title: body.title,
        description: body.description,
        dueDate: new Date(body.dueDate),
      }))
    );
    await db.insert(events).values(
      memberRows.map((m) => ({
        userId: m.userId,
        assignmentId: assignment.id,
        title: body.title,
        description: body.description ?? null,
        startDate: new Date(body.dueDate),
        endDate: new Date(body.dueDate),
        type: 'DEADLINE' as const,
      }))
    );
  }

  await logAction(db, user.id, `Created assignment ${assignment.id} for group ${groupId}`);
  return { assignment, tasksCreated: memberRows.length };
}
```

- [ ] **Step 2: Rewrite `src/routes/groups.ts`**

```ts
import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as GroupsController from '../controllers/groups.controller';

const CreateGroupSchema = z.object({ name: z.string().min(1) });
const AddMembersSchema = z.object({ userIds: z.array(z.number()) });
const CreateAssignmentSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string(),
  description: z.string().optional(),
});

export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type AddMembersInput = z.infer<typeof AddMembersSchema>;
export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;

export const groupsRoutes = new Elysia({ prefix: '/groups' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', ({ user }) => GroupsController.listGroups(user as AuthUser))
  .post('/', ({ user, body }) => GroupsController.createGroup(user as AuthUser, body), zodBody(CreateGroupSchema))
  .get('/:id', ({ user, params }) => GroupsController.getGroup(user as AuthUser, parseInt(params.id)))
  .delete('/:id', ({ user, params }) => GroupsController.deleteGroup(user as AuthUser, parseInt(params.id)))
  .post(
    '/:id/members',
    ({ user, params, body }) => GroupsController.addMembers(user as AuthUser, parseInt(params.id), body),
    zodBody(AddMembersSchema)
  )
  .delete('/:id/members/:userId', ({ user, params }) =>
    GroupsController.removeMember(user as AuthUser, parseInt(params.id), parseInt(params.userId))
  )
  .get('/:id/assignments', ({ user, params }) =>
    GroupsController.listAssignments(user as AuthUser, parseInt(params.id))
  )
  .post(
    '/:id/assignments',
    ({ user, params, body }) =>
      GroupsController.createAssignment(user as AuthUser, parseInt(params.id), body),
    zodBody(CreateAssignmentSchema)
  );
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && bun test
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/controllers/groups.controller.ts apps/backend/src/routes/groups.ts
git commit -m "refactor: extract groups controller"
```

---

## Task 10: Migrate `tasks`

**Files:**
- Create: `apps/backend/src/controllers/tasks.controller.ts`
- Modify: `apps/backend/src/routes/tasks.ts`

- [ ] **Step 1: Create `src/controllers/tasks.controller.ts`**

```ts
import { db } from '../db';
import { tasks, evals, assignments, users } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import type { CreateTaskInput, UpdateTaskInput, EvalInput, AssignTaskInput } from '../routes/tasks';

export async function listTasks(user: AuthUser) {
  const parentTasks = await db
    .select({
      id: tasks.id, userId: tasks.userId, assignmentId: tasks.assignmentId,
      courseId: tasks.courseId, parentId: tasks.parentId, title: tasks.title,
      description: tasks.description, dueDate: tasks.dueDate, status: tasks.status,
      priority: tasks.priority, tags: tasks.tags, deletedAt: tasks.deletedAt,
      assignmentDeadline: assignments.dueDate,
      evalId: evals.id, evalScore: evals.score, evalFeedback: evals.feedback, evalEvaluatedAt: evals.evaluatedAt,
    })
    .from(tasks)
    .leftJoin(assignments, eq(tasks.assignmentId, assignments.id))
    .leftJoin(evals, eq(evals.taskId, tasks.id))
    .where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt), isNull(tasks.parentId)));

  const allSubtasks = await db
    .select({ parentId: tasks.parentId, status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt), isNotNull(tasks.parentId)));

  const subtaskMap = new Map<number, { total: number; done: number }>();
  for (const sub of allSubtasks) {
    if (sub.parentId === null) continue;
    const entry = subtaskMap.get(sub.parentId) ?? { total: 0, done: 0 };
    entry.total++;
    if (sub.status === 'DONE') entry.done++;
    subtaskMap.set(sub.parentId, entry);
  }

  return parentTasks.map(({ evalId, evalScore, evalFeedback, evalEvaluatedAt, ...task }) => ({
    ...task,
    assignmentDeadline: task.assignmentDeadline?.toISOString() ?? null,
    subtaskCount: subtaskMap.get(task.id)?.total ?? 0,
    doneSubtaskCount: subtaskMap.get(task.id)?.done ?? 0,
    eval: evalId != null
      ? { id: evalId, taskId: task.id, score: evalScore!, feedback: evalFeedback!, evaluatedAt: evalEvaluatedAt!.toISOString() }
      : null,
  }));
}

export async function createTask(user: AuthUser, body: CreateTaskInput) {
  if (body.parentId !== undefined) {
    const [parent] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, body.parentId), eq(tasks.userId, user.id), isNull(tasks.deletedAt), isNull(tasks.parentId)));
    if (!parent) throw new NotFoundError('Parent task not found or is itself a subtask');
  }
  const [task] = await db
    .insert(tasks)
    .values({
      userId: user.id,
      title: body.title,
      ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
      description: body.description,
      assignmentId: body.assignmentId,
      parentId: body.parentId,
      courseId: body.courseId,
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.tags !== undefined && { tags: body.tags }),
    })
    .returning();
  await logAction(db, user.id, `Created task ${task.id}: ${task.title}`);
  return task;
}

export async function getTask(user: AuthUser, id: number) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id), isNull(tasks.deletedAt)));
  if (!task) throw new NotFoundError('Task not found or access denied');

  const subtasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.parentId, task.id), isNull(tasks.deletedAt)));
  const [evalRow] = await db.select().from(evals).where(eq(evals.taskId, task.id));
  return {
    ...task,
    subtasks,
    eval: evalRow
      ? { id: evalRow.id, taskId: evalRow.taskId, score: evalRow.score, feedback: evalRow.feedback, evaluatedAt: evalRow.evaluatedAt.toISOString() }
      : null,
  };
}

export async function updateTask(user: AuthUser, id: number, body: UpdateTaskInput) {
  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id), isNull(tasks.deletedAt)));
  if (!existing) throw new NotFoundError('Task not found or access denied');

  if (body.parentId !== undefined && body.parentId !== null) {
    const [parent] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, body.parentId), eq(tasks.userId, user.id), isNull(tasks.deletedAt), isNull(tasks.parentId)));
    if (!parent) throw new NotFoundError('Parent task not found or is itself a subtask');
  }

  const [updated] = await db
    .update(tasks)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
      ...(body.status !== undefined && { status: body.status }),
      ...('parentId' in body && { parentId: body.parentId }),
      ...('courseId' in body && { courseId: body.courseId }),
      ...('priority' in body && { priority: body.priority ?? null }),
      ...(body.tags !== undefined && { tags: body.tags }),
    })
    .where(eq(tasks.id, existing.id))
    .returning();
  await logAction(db, user.id, `Updated task ${existing.id}`);
  return updated;
}

export async function deleteTask(user: AuthUser, id: number) {
  const isAdmin = user.roles.includes('ADMIN');
  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), isAdmin ? undefined : eq(tasks.userId, user.id), isNull(tasks.deletedAt)));
  if (!existing) throw new NotFoundError('Task not found or access denied');

  const subtasksToDelete = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.parentId, existing.id), isNull(tasks.deletedAt)));
  for (const sub of subtasksToDelete) {
    await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, sub.id));
    await logAction(db, user.id, `Deleted subtask ${sub.id} (cascade from ${existing.id})`);
  }
  await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, existing.id));
  await logAction(db, user.id, `Deleted task ${existing.id}`);
  return { success: true };
}

export async function toggleDone(user: AuthUser, id: number) {
  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id), isNull(tasks.deletedAt)));
  if (!existing) throw new NotFoundError('Task not found or access denied');

  const newStatus = existing.status === 'DONE' ? 'TODO' : 'DONE';
  const [updated] = await db
    .update(tasks)
    .set({ status: newStatus, completedAt: newStatus === 'DONE' ? new Date() : null })
    .where(eq(tasks.id, existing.id))
    .returning();
  await logAction(db, user.id, `Toggled task ${existing.id} to ${newStatus}`);
  return updated;
}

export async function createEval(user: AuthUser, id: number, body: EvalInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('Only teachers can evaluate tasks');

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)));
  if (!task) throw new NotFoundError('Task not found');
  if (task.status !== 'DONE') {
    const err = new NotFoundError('Task must be DONE before it can be evaluated');
    (err as unknown as { status: number }).status = 400;
    (err as unknown as { code: string }).code = 'TASK_NOT_DONE';
    throw err;
  }

  const [existing] = await db.select().from(evals).where(eq(evals.taskId, task.id));
  let evalRow;
  if (existing) {
    const [updated] = await db
      .update(evals)
      .set({ score: body.score, feedback: body.feedback, evaluatedAt: new Date() })
      .where(eq(evals.id, existing.id))
      .returning();
    evalRow = updated;
    await logAction(db, user.id, `Updated eval for task ${task.id}`);
  } else {
    const [created] = await db
      .insert(evals)
      .values({ taskId: task.id, score: body.score, feedback: body.feedback, evaluatedAt: new Date() })
      .returning();
    evalRow = created;
    await logAction(db, user.id, `Created eval for task ${task.id}`);
  }
  return evalRow;
}

export async function getEval(user: AuthUser, id: number) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)));
  if (!task) throw new NotFoundError('Task not found');
  if (task.userId !== user.id && !user.roles.includes('TEACHER')) throw new ForbiddenError('Access denied');

  const [evalRow] = await db.select().from(evals).where(eq(evals.taskId, task.id));
  if (!evalRow) throw new NotFoundError('No evaluation yet');
  return evalRow;
}

export async function assignTask(user: AuthUser, body: AssignTaskInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('Only teachers can assign tasks to students');

  const [student] = await db.select({ id: users.id }).from(users).where(eq(users.id, body.studentId));
  if (!student) throw new NotFoundError('Student not found');

  const [task] = await db
    .insert(tasks)
    .values({
      userId: body.studentId,
      title: body.title,
      ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
      description: body.description,
      courseId: body.courseId,
    })
    .returning();
  await logAction(db, user.id, `Teacher assigned task ${task.id} to student ${body.studentId}`);
  return task;
}
```

- [ ] **Step 2: Rewrite `src/routes/tasks.ts`**

```ts
import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as TasksController from '../controllers/tasks.controller';

const EvalSchema = z.object({ score: z.number().int().min(0), feedback: z.string() });
const CreateTaskSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  assignmentId: z.number().optional(),
  parentId: z.number().optional(),
  courseId: z.number().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});
const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['TODO', 'IN PROGRESS', 'DONE']).optional(),
  parentId: z.number().nullable().optional(),
  courseId: z.number().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});
const AssignTaskSchema = z.object({
  studentId: z.number().int().positive(),
  title: z.string().min(1),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  courseId: z.number().optional(),
});

export type EvalInput = z.infer<typeof EvalSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type AssignTaskInput = z.infer<typeof AssignTaskSchema>;

export const tasksRoutes = new Elysia({ prefix: '/tasks' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', ({ user }) => TasksController.listTasks(user as AuthUser))
  .post('/', ({ user, body }) => TasksController.createTask(user as AuthUser, body), zodBody(CreateTaskSchema))
  .get('/:id', ({ user, params }) => TasksController.getTask(user as AuthUser, Number(params.id)))
  .patch('/:id', ({ user, params, body }) => TasksController.updateTask(user as AuthUser, Number(params.id), body), zodBody(UpdateTaskSchema))
  .delete('/:id', ({ user, params }) => TasksController.deleteTask(user as AuthUser, Number(params.id)))
  .patch('/:id/toggle-done', ({ user, params }) => TasksController.toggleDone(user as AuthUser, Number(params.id)))
  .post('/:id/eval', ({ user, params, body }) => TasksController.createEval(user as AuthUser, Number(params.id), body), zodBody(EvalSchema))
  .get('/:id/eval', ({ user, params }) => TasksController.getEval(user as AuthUser, Number(params.id)))
  .post('/assign', ({ user, body }) => TasksController.assignTask(user as AuthUser, body), zodBody(AssignTaskSchema));
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && bun test
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/controllers/tasks.controller.ts apps/backend/src/routes/tasks.ts
git commit -m "refactor: extract tasks controller"
```

---

## Task 11: Migrate `users`

**Files:**
- Create: `apps/backend/src/controllers/users.controller.ts`
- Modify: `apps/backend/src/routes/users.ts`

- [ ] **Step 1: Create `src/controllers/users.controller.ts`**

```ts
import { db } from '../db';
import { users, userProfiles, userSettings, userCourses, courses, userIntegrations } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, ilike, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { NotFoundError, BadRequestError, ConflictError, InternalError } from '../lib/errors';
import { uploadFile, getPublicUrl, AVATARS_BUCKET } from '../services/storage';
import type { UpdateProfileInput, UpdateSettingsInput, ChangePasswordInput } from '../routes/users';

export async function getMe(user: AuthUser) {
  const uid = user.id;
  const [baseUser] = await db
    .select({ id: users.id, email: users.email, login: users.login })
    .from(users)
    .where(and(eq(users.id, uid), isNull(users.deletedAt)));
  if (!baseUser) throw new NotFoundError('User not found');

  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, uid));
  const [settings] = await db
    .select({ notificationsEnabled: userSettings.notificationsEnabled, lightTheme: userSettings.lightTheme })
    .from(userSettings)
    .where(eq(userSettings.userId, uid))
    .catch(() => [null]);

  const lectureTeachers = alias(users, 'lecture_teachers');
  const seminarTeachers = alias(users, 'seminar_teachers');
  const lectureTeacherProfiles = alias(userProfiles, 'lecture_teacher_profiles');
  const seminarTeacherProfiles = alias(userProfiles, 'seminar_teacher_profiles');

  const courseRows = await db
    .select({
      courseId: courses.id, code: courses.code, name: courses.name,
      lectureTeacherId: courses.lectureTeacherId, lectureTeacherEmail: lectureTeachers.email,
      lectureTeacherName: lectureTeacherProfiles.name, seminarTeacherId: courses.seminarTeacherId,
      seminarTeacherEmail: seminarTeachers.email, seminarTeacherName: seminarTeacherProfiles.name,
    })
    .from(userCourses)
    .innerJoin(courses, and(eq(userCourses.courseId, courses.id), isNull(courses.deletedAt)))
    .leftJoin(lectureTeachers, eq(courses.lectureTeacherId, lectureTeachers.id))
    .leftJoin(lectureTeacherProfiles, eq(courses.lectureTeacherId, lectureTeacherProfiles.userId))
    .leftJoin(seminarTeachers, eq(courses.seminarTeacherId, seminarTeachers.id))
    .leftJoin(seminarTeacherProfiles, eq(courses.seminarTeacherId, seminarTeacherProfiles.userId))
    .where(eq(userCourses.userId, uid))
    .catch(() => []);

  const integrationRows = await db
    .select({ service: userIntegrations.service, connectedAt: userIntegrations.connectedAt })
    .from(userIntegrations)
    .where(and(eq(userIntegrations.userId, uid), eq(userIntegrations.connected, true)))
    .catch(() => []);

  return {
    id: baseUser.id, email: baseUser.email, login: baseUser.login, roles: user.roles,
    profile: { name: profile?.name ?? null, title: profile?.title ?? null, organization: profile?.organization ?? null, bio: profile?.bio ?? null, avatar: profile?.avatar ?? null },
    settings: { notificationsEnabled: settings?.notificationsEnabled ?? true, lightTheme: settings?.lightTheme ?? true },
    enrolledCourses: courseRows.map((row) => ({
      courseId: row.courseId, code: row.code, name: row.name,
      lectureTeacher: row.lectureTeacherId ? { id: row.lectureTeacherId, name: row.lectureTeacherName ?? null, email: row.lectureTeacherEmail ?? '' } : null,
      seminarTeacher: row.seminarTeacherId ? { id: row.seminarTeacherId, name: row.seminarTeacherName ?? null, email: row.seminarTeacherEmail ?? '' } : null,
    })),
    integrations: integrationRows.map((r) => ({
      service: r.service,
      connectedAt: r.connectedAt instanceof Date ? r.connectedAt.toISOString() : typeof r.connectedAt === 'string' ? r.connectedAt : new Date().toISOString(),
    })),
  };
}

export async function updateProfile(user: AuthUser, body: UpdateProfileInput) {
  const uid = user.id;
  if (body.login !== undefined) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.login, body.login), isNull(users.deletedAt)));
    if (existing && existing.id !== uid) throw new ConflictError('Login is already taken');
    await db.update(users).set({ login: body.login }).where(eq(users.id, uid));
  }
  const values = {
    userId: uid,
    ...(body.name !== undefined && { name: body.name }),
    ...(body.title !== undefined && { title: body.title }),
    ...(body.organization !== undefined && { organization: body.organization }),
    ...(body.bio !== undefined && { bio: body.bio }),
  };
  const [updated] = await db
    .insert(userProfiles)
    .values(values)
    .onConflictDoUpdate({ target: userProfiles.userId, set: values })
    .returning();
  await logAction(db, uid, `Updated profile`);
  return updated;
}

export async function uploadAvatar(user: AuthUser, request: Request) {
  const uid = user.id;
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) throw new BadRequestError('file is required');

  const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
  if (!ALLOWED_TYPES.includes(file.type)) throw new BadRequestError('Only JPEG and PNG images are allowed');
  if (file.size > 256 * 1024) throw new BadRequestError('File must be smaller than 256 KB');

  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const storagePath = `${uid}/${crypto.randomUUID()}.${ext}`;
  try {
    await uploadFile(AVATARS_BUCKET, storagePath, file);
  } catch (e) {
    const err = new BadRequestError((e as Error).message);
    (err as unknown as { status: number }).status = 502;
    (err as unknown as { code: string }).code = 'UPLOAD_FAILED';
    throw err;
  }

  const avatarUrl = getPublicUrl(AVATARS_BUCKET, storagePath);
  await db
    .insert(userProfiles)
    .values({ userId: uid, avatar: avatarUrl })
    .onConflictDoUpdate({ target: userProfiles.userId, set: { avatar: avatarUrl } });
  await logAction(db, uid, `Updated avatar`);
  return { avatarUrl };
}

export async function getSettings(user: AuthUser) {
  const [settings] = await db
    .select({ notificationsEnabled: userSettings.notificationsEnabled, lightTheme: userSettings.lightTheme })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .catch(() => [null]);
  return { notificationsEnabled: settings?.notificationsEnabled ?? true, lightTheme: settings?.lightTheme ?? true };
}

export async function updateSettings(user: AuthUser, body: UpdateSettingsInput) {
  const uid = user.id;
  const values = {
    userId: uid,
    ...(body.notificationsEnabled !== undefined && { notificationsEnabled: body.notificationsEnabled }),
    ...(body.lightTheme !== undefined && { lightTheme: body.lightTheme }),
  };
  let updated;
  try {
    [updated] = await db.insert(userSettings).values(values).onConflictDoUpdate({ target: userSettings.userId, set: values }).returning();
  } catch {
    updated = { ...values };
  }
  await logAction(db, uid, `Updated settings`);
  return updated;
}

export async function changePassword(user: AuthUser, body: ChangePasswordInput) {
  const uid = user.id;
  const [userData] = await db.select({ authId: users.authId }).from(users).where(eq(users.id, uid));
  if (!userData?.authId) throw new InternalError('User auth ID not found');

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new InternalError('Server misconfiguration');

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userData.authId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: body.newPassword }),
  });
  if (!response.ok) throw new InternalError('Failed to update password');

  await logAction(db, uid, `Changed password`);
  return { success: true };
}

export async function searchUsers(q: string | undefined) {
  if (!q || q.length < 2) throw new BadRequestError('Search query must be at least 2 characters');
  return db
    .select({ id: users.id, login: users.login, email: users.email, name: userProfiles.name })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(isNull(users.deletedAt), or(ilike(users.login, `%${q}%`), ilike(users.email, `%${q}%`), ilike(userProfiles.name, `%${q}%`))))
    .limit(20);
}

export async function getCalendarToken(user: AuthUser) {
  const [settings] = await db
    .select({ calendarToken: userSettings.calendarToken })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));
  if (settings?.calendarToken) return { token: settings.calendarToken };

  const token = crypto.randomUUID();
  await db.insert(userSettings).values({ userId: user.id, calendarToken: token }).onConflictDoUpdate({ target: userSettings.userId, set: { calendarToken: token } });
  return { token };
}

export async function regenerateCalendarToken(user: AuthUser) {
  const token = crypto.randomUUID();
  await db.insert(userSettings).values({ userId: user.id, calendarToken: token }).onConflictDoUpdate({ target: userSettings.userId, set: { calendarToken: token } });
  await logAction(db, user.id, 'Regenerated calendar token');
  return { token };
}

export async function connectIntegration(user: AuthUser, service: string) {
  await db
    .insert(userIntegrations)
    .values({ userId: user.id, service, connected: true, connectedAt: new Date() })
    .onConflictDoUpdate({ target: [userIntegrations.userId, userIntegrations.service], set: { connected: true, connectedAt: new Date() } });
  return { success: true };
}

export async function disconnectIntegration(user: AuthUser, service: string) {
  const [row] = await db
    .select()
    .from(userIntegrations)
    .where(and(eq(userIntegrations.userId, user.id), eq(userIntegrations.service, service)));
  if (!row) throw new NotFoundError('Integration not found');
  await db
    .update(userIntegrations)
    .set({ connected: false, connectedAt: null })
    .where(and(eq(userIntegrations.userId, user.id), eq(userIntegrations.service, service)));
  return { success: true };
}

export async function getUserById(id: number) {
  if (isNaN(id)) throw new BadRequestError('User ID must be a number');
  const [row] = await db
    .select({ id: users.id, login: users.login, name: userProfiles.name, title: userProfiles.title, avatar: userProfiles.avatar, organization: userProfiles.organization, bio: userProfiles.bio })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(eq(users.id, id), isNull(users.deletedAt)));
  if (!row) throw new NotFoundError('User not found');
  return row;
}
```

- [ ] **Step 2: Rewrite `src/routes/users.ts`**

```ts
import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as UsersController from '../controllers/users.controller';

const UpdateProfileSchema = z.object({
  name: z.string().nullish(),
  title: z.string().nullish(),
  organization: z.string().nullish(),
  bio: z.string().nullish(),
  login: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
});
const UpdateSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  lightTheme: z.boolean().optional(),
  language: z.enum(['en', 'cs']).optional(),
  customNav: z.any().optional(),
});
const ChangePasswordSchema = z.object({ newPassword: z.string().min(8) });

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const usersRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/me', ({ user }) => UsersController.getMe(user as AuthUser))
  .patch('/me/profile', ({ user, body }) => UsersController.updateProfile(user as AuthUser, body), zodBody(UpdateProfileSchema))
  .post('/me/avatar', ({ user, request }) => UsersController.uploadAvatar(user as AuthUser, request))
  .get('/me/settings', ({ user }) => UsersController.getSettings(user as AuthUser))
  .patch('/me/settings', ({ user, body }) => UsersController.updateSettings(user as AuthUser, body), zodBody(UpdateSettingsSchema))
  .patch('/me/password', ({ user, body }) => UsersController.changePassword(user as AuthUser, body), zodBody(ChangePasswordSchema))
  .get('/search', ({ query }) => UsersController.searchUsers(query.q as string | undefined))
  .get('/me/calendar-token', ({ user }) => UsersController.getCalendarToken(user as AuthUser))
  .post('/me/calendar-token', ({ user }) => UsersController.regenerateCalendarToken(user as AuthUser))
  .post('/me/integrations/:service', ({ user, params }) => UsersController.connectIntegration(user as AuthUser, params.service))
  .delete('/me/integrations/:service', ({ user, params }) => UsersController.disconnectIntegration(user as AuthUser, params.service))
  .get('/:id', ({ params }) => UsersController.getUserById(parseInt(params.id, 10)));
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && bun test
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/controllers/users.controller.ts apps/backend/src/routes/users.ts
git commit -m "refactor: extract users controller"
```

---

## Task 12: Migrate `ai`

**Files:**
- Create: `apps/backend/src/controllers/ai.controller.ts`
- Modify: `apps/backend/src/routes/ai.ts`

- [ ] **Step 1: Create `src/controllers/ai.controller.ts`**

```ts
import OpenAI from 'openai';
import { db } from '../db';
import { tasks, events, courses, notes, userCourses } from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, lte, gte } from 'drizzle-orm';
import { NotFoundError, RateLimitError } from '../lib/errors';
import { getToolsForRole, TOOL_MUTATES } from '../ai/tools';
import { executeTool } from '../ai/executor';
import type { BriefInput, ChatInput, QuizLangInput, AgentInput } from '../routes/ai';

const client = new OpenAI({
  apiKey: process.env.E_INFRA_API_TOKEN,
  baseURL: process.env.EINFRA_BASE_URL ?? 'https://llm.ai.e-infra.cz/v1/',
});
const MODEL = process.env.EINFRA_MODEL ?? 'qwen3.5';

const rateLimitMap = new Map<number, { count: number; resetAt: number }>();
function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

function formatActionLabel(toolName: string, args: Record<string, unknown>): string {
  const name = (args.title ?? args.name ?? args.text ?? '') as string;
  const actionMap: Record<string, string> = {
    create_task: `Vytvoriť úlohu${name ? ` "${name}"` : ''}`,
    update_task: `Aktualizovať úlohu${name ? ` "${name}"` : ''}`,
    delete_task: `Zmazať úlohu`,
    create_event: `Vytvoriť udalosť${name ? ` "${name}"` : ''}`,
    update_event: `Aktualizovať udalosť${name ? ` "${name}"` : ''}`,
    delete_event: `Zmazať udalosť`,
    create_note: `Vytvoriť poznámku${name ? ` "${name}"` : ''}`,
    update_note: `Aktualizovať poznámku${name ? ` "${name}"` : ''}`,
    delete_note: `Zmazať poznámku`,
  };
  return actionMap[toolName] ?? `Vykonať: ${toolName.replace(/_/g, ' ')}${name ? ` "${name}"` : ''}`;
}

export async function brief(user: AuthUser, body: BriefInput) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();
  const lang = body.lang ?? 'sk';
  const langLabel = lang === 'en' ? 'English' : 'Slovak';
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const userTasks = await db.select().from(tasks).where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt), lte(tasks.dueDate, weekFromNow)));
  const userEvents = await db.select().from(events).where(and(eq(events.userId, user.id), isNull(events.deletedAt)));
  const today = new Date().toISOString().split('T')[0];
  const context = JSON.stringify({ today, tasks: userTasks, events: userEvents });

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: `You are a student assistant. You will receive a JSON with today's date, the student's tasks and events.\nToday is ${today}. Tasks with dueDate before today are overdue.\nGenerate a short daily brief (2-3 sentences) and identify the top 3 priorities.\nFor each priority determine urgency: high = overdue or deadline within 1 day, medium = within 3 days, low = later.\nRespond in ${langLabel}.\nReturn ONLY as JSON with no extra text:\n{"brief":"...","priorities":[{"title":"...","dueDate":"...","urgency":"high"}]}` },
      { role: 'user', content: context },
    ],
  });

  const raw = completion.choices[0].message.content ?? '{}';
  const jsonMatch = raw.match(/\{[\s\S]*}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { brief: raw, priorities: [] };
  await logAction(db, user.id, 'Generated AI daily brief');
  return parsed;
}

export async function chat(user: AuthUser, body: ChatInput) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();
  const userTasks = await db.select().from(tasks).where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt)));
  const enrolledCourses = await db
    .select({ id: courses.id, name: courses.name, code: courses.code })
    .from(courses)
    .innerJoin(userCourses, eq(userCourses.courseId, courses.id))
    .where(and(eq(userCourses.userId, user.id), isNull(courses.deletedAt)));

  const today = new Date().toISOString().split('T')[0];
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: `You are a student AI assistant. Today is ${today}. Tasks with dueDate before today are overdue.\nStudent context: tasks=${JSON.stringify(userTasks)}, courses=${JSON.stringify(enrolledCourses)}.\nRespond in the language the user writes in (Slovak or English). Be concise and specific.` },
      ...body.messages,
    ],
  });
  await logAction(db, user.id, 'AI chat message');
  return { reply: completion.choices[0].message.content ?? '' };
}

export async function quiz(user: AuthUser, noteId: number, body: QuizLangInput) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();
  const lang = body.lang ?? 'sk';
  const langLabel = lang === 'en' ? 'English' : 'Slovak';

  const [note] = await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.userId, user.id), isNull(notes.deletedAt)));
  if (!note) throw new NotFoundError('Note not found or access denied');

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: `You are an examiner. You will receive note text. Create exactly 5 multiple-choice questions.\nEach question has 4 options (array of strings). The correct answer is at index correct (0-3).\nQuestions must be in ${langLabel}.\nReturn ONLY as JSON with no extra text:\n{"questions":[{"question":"...","options":["A","B","C","D"],"correct":0}]}` },
      { role: 'user', content: note.description ?? note.title },
    ],
  });

  const raw = completion.choices[0].message.content ?? '{}';
  const jsonMatch = raw.match(/\{[\s\S]*}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [] };
  await logAction(db, user.id, `Generated quiz for note ${note.id}`);
  return parsed;
}

export async function noteChat(user: AuthUser, noteId: number, body: ChatInput) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();
  const [note] = await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.userId, user.id), isNull(notes.deletedAt)));
  if (!note) throw new NotFoundError('Note not found or access denied');

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: `Si asistent pre štúdium. Odpovedaj IBA na základe nasledujúcej poznámky.\nAk odpoveď v poznámke nie je, úprimne to povedz.\nJazyk odpovede = jazyk otázky.\n\nPOZNÁMKA:\n${note.description ?? note.title}` },
      ...body.messages,
    ],
  });
  await logAction(db, user.id, `AI note chat for note ${note.id}`);
  return { reply: completion.choices[0].message.content ?? '' };
}

export async function agent(user: AuthUser, body: AgentInput, authHeader: string) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();
  const lang = body.lang ?? 'sk';
  const langLabel = lang === 'en' ? 'English' : 'Slovak';
  const today = new Date().toISOString().split('T')[0];
  const isTeacher = user.roles.includes('TEACHER');

  const systemPrompt = isTeacher
    ? `You are an AI assistant for a university teacher. Today is ${today}.\nYou can: assign tasks to groups (create_assignment) or individual students (assign_task_to_student), list groups and their members, search students by name or email, and browse study materials for courses.\nWhen assigning to a student, ALWAYS call list_students first. If multiple students match, do NOT guess — show the user their name and login (login is unique) and ask which one to assign to. Wait for clarification before calling assign_task_to_student.\nWhen assigning to a group, use list_groups and list_group_members first.\nNever share one student's data with another. Be concise. Never expose raw JSON. Respond in ${langLabel}.`
    : `You are an AI assistant for a student. Today is ${today}.\nYou have tools to read and manage tasks, notes, events, courses, and study materials.\nKEY DISTINCTION: "deadlines" (termíny) are calendar EVENTS with type=DEADLINE — stored separately from tasks. Always use list_events for deadline questions, never list_tasks.\nSTRICT RULES:\n1. Be SHORT. Answer in the fewest words possible. Never over-explain or add unsolicited context.\n2. Call ONLY the tool needed for the user's exact question. Do NOT call extra tools unprompted.\n3. After calling any list tool, reply with ONE SHORT SENTENCE only. The UI renders items as cards — NEVER output tables, lists, or enumerations.\n4. If nothing is found, say so in one sentence. Do not suggest alternatives or add commentary.\nRespond in ${langLabel}. Never expose raw JSON.`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: 'system', content: systemPrompt }, ...body.messages];

  if (body.confirm) {
    const confirmResult = await executeTool(body.confirm.name, body.confirm.args as Record<string, unknown>, authHeader);
    await logAction(db, user.id, `AI agent executed tool: ${body.confirm.name}`);
    messages.push({ role: 'assistant' as const, content: null, tool_calls: [{ id: 'confirmed', type: 'function' as const, function: { name: body.confirm.name, arguments: JSON.stringify(body.confirm.args) } }] });
    messages.push({ role: 'tool' as const, tool_call_id: 'confirmed', content: JSON.stringify(confirmResult) });
  }

  const LIST_DISPLAY_TOOLS: Record<string, 'tasks' | 'events' | 'notes' | 'courses'> = { list_tasks: 'tasks', list_events: 'events', list_notes: 'notes', list_courses: 'courses' };
  let lastDisplay: { type: 'tasks' | 'events' | 'notes' | 'courses'; items: unknown[] } | undefined;
  let listToolCalled = false;

  for (let i = 0; i < 6; i++) {
    const completion = await client.chat.completions.create({ model: MODEL, messages, tools: getToolsForRole(user.roles) });
    const choice = completion.choices[0];
    const msg = choice.message;

    if (choice.finish_reason === 'stop' || !msg.tool_calls?.length) {
      await logAction(db, user.id, 'AI agent chat');
      const rawReply = msg.content ?? '';
      const stripped = rawReply.split('\n').filter((line) => !line.match(/^\s*\|/)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
      const reply = listToolCalled ? (stripped.split('\n').find((l) => l.trim()) ?? stripped) : stripped;
      return { reply, display: lastDisplay };
    }

    const toolCall = msg.tool_calls[0];
    const toolName = toolCall.function.name;
    const toolArgs = JSON.parse(toolCall.function.arguments ?? '{}');

    if (TOOL_MUTATES[toolName]) {
      await logAction(db, user.id, `AI agent pending action: ${toolName}`);
      return { pendingAction: { name: toolName, args: toolArgs, label: formatActionLabel(toolName, toolArgs) } };
    }

    const result = await executeTool(toolName, toolArgs, authHeader);
    await logAction(db, user.id, `AI agent tool: ${toolName}`);

    if (LIST_DISPLAY_TOOLS[toolName]) listToolCalled = true;
    if (LIST_DISPLAY_TOOLS[toolName] && !lastDisplay) {
      const now = new Date();
      let items = Array.isArray(result) ? result : [];
      if (toolName === 'list_tasks') items = items.filter((t: unknown) => (t as Record<string, unknown>).status !== 'DONE');
      if (toolName === 'list_events') items = items.filter((e: unknown) => { const start = (e as Record<string, unknown>).startDate; return start && new Date(String(start)) >= now; });
      if (items.length > 0) lastDisplay = { type: LIST_DISPLAY_TOOLS[toolName], items };
    }

    messages.push({ role: 'assistant', content: null, tool_calls: msg.tool_calls });
    messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
  }

  return { reply: 'Nepodarilo sa dokončiť požiadavku.', display: lastDisplay };
}

export async function daySummary(user: AuthUser, lang: string) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();
  const langLabel = lang === 'en' ? 'English' : 'Slovak';
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const today = now.toISOString().split('T')[0];

  const dueTasks = await db.select().from(tasks).where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt), lte(tasks.dueDate, dayEnd)));
  const dayEvents = await db.select().from(events).where(and(eq(events.userId, user.id), isNull(events.deletedAt), gte(events.startDate, dayStart), lte(events.startDate, dayEnd)));
  const context = JSON.stringify({ today, tasks: dueTasks, events: dayEvents });

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: `You are a student assistant. You receive a JSON with today's date, the student's tasks due today or earlier, and today's events.\nToday is ${today}. Tasks with dueDate before today are overdue.\nWrite a concise, encouraging summary of the student's day: what is due today, what is overdue, which events are scheduled, and what the student should prioritize first.\nUse short Markdown sections with headings and bullet points. Keep it under ~150 words. Respond in ${langLabel}.` },
      { role: 'user', content: context },
    ],
  });
  await logAction(db, user.id, 'Generated AI day summary');
  return { summary: completion.choices[0].message.content ?? '' };
}

export async function timelineSummary(user: AuthUser, lang: string) {
  if (!checkRateLimit(user.id)) throw new RateLimitError();
  const langLabel = lang === 'en' ? 'English' : 'Slovak';
  const today = new Date().toISOString().split('T')[0];

  const allTasks = await db.select().from(tasks).where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt)));
  const allEvents = await db.select().from(events).where(and(eq(events.userId, user.id), isNull(events.deletedAt)));
  const deadlines = allTasks.filter((t) => t.dueDate).map((t) => ({ title: t.title, dueDate: t.dueDate, status: t.status }));
  const context = JSON.stringify({ today, deadlines, events: allEvents });

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: `You are a student planning assistant. You receive a JSON with today's date, the student's task deadlines, and their events.\nToday is ${today}.\nAnalyze the structure of the timeline. Describe the overall workload distribution, identify peak periods (clusters of deadlines/events on the same days or weeks), and point out notable gaps (free stretches with no commitments).\nGive 1-2 short, actionable suggestions to balance the workload.\nUse short Markdown sections with headings and bullet points. Keep it under ~180 words. Respond in ${langLabel}.` },
      { role: 'user', content: context },
    ],
  });
  await logAction(db, user.id, 'Generated AI timeline summary');
  return { summary: completion.choices[0].message.content ?? '' };
}
```

- [ ] **Step 2: Rewrite `src/routes/ai.ts`**

```ts
import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as AiController from '../controllers/ai.controller';

const BriefSchema = z.object({ lang: z.string().optional() });
const ChatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
  lang: z.string().optional(),
});
const QuizLangSchema = z.object({ lang: z.string().optional() });
const AgentSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
  confirm: z.object({ name: z.string(), args: z.record(z.unknown()) }).optional(),
  lang: z.string().optional(),
});

export type BriefInput = z.infer<typeof BriefSchema>;
export type ChatInput = z.infer<typeof ChatSchema>;
export type QuizLangInput = z.infer<typeof QuizLangSchema>;
export type AgentInput = z.infer<typeof AgentSchema>;

export const aiRoutes = new Elysia({ prefix: '/ai' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .post('/brief', ({ user, body }) => AiController.brief(user as AuthUser, body), zodBody(BriefSchema))
  .post('/chat', ({ user, body }) => AiController.chat(user as AuthUser, body), zodBody(ChatSchema))
  .post('/notes/:id/quiz', ({ user, params, body }) => AiController.quiz(user as AuthUser, Number(params.id), body), zodBody(QuizLangSchema))
  .post('/notes/:id/chat', ({ user, params, body }) => AiController.noteChat(user as AuthUser, Number(params.id), body), zodBody(ChatSchema))
  .post('/agent', ({ user, body, request }) => AiController.agent(user as AuthUser, body, request.headers.get('authorization') ?? ''), zodBody(AgentSchema))
  .get('/day_summary', ({ user, query }) => AiController.daySummary(user as AuthUser, (query.lang as string | undefined) ?? 'sk'))
  .get('/timeline_summary', ({ user, query }) => AiController.timelineSummary(user as AuthUser, (query.lang as string | undefined) ?? 'sk'));
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && bun test
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/controllers/ai.controller.ts apps/backend/src/routes/ai.ts
git commit -m "refactor: extract ai controller"
```

---

## Task 13: Migrate `courses`

**Files:**
- Create: `apps/backend/src/controllers/courses.controller.ts`
- Modify: `apps/backend/src/routes/courses.ts`

- [ ] **Step 1: Create `src/controllers/courses.controller.ts`**

```ts
import { db } from '../db';
import {
  courses, userCourses, tasks, assignments, assignmentSubtasks,
  userProfiles, users, evals, events,
} from '../db/schema';
import { type AuthUser } from '../middleware/auth';
import { logAction } from '../services/audit';
import { eq, and, isNull, isNotNull, sql, count } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../lib/errors';
import type {
  CreateCourseInput, UpdateCourseInput, CreateAssignmentInput,
  UpdateAssignmentInput, EnrollStudentInput,
} from '../routes/courses';

async function requireCourse(courseId: number) {
  const [course] = await db.select().from(courses).where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
  if (!course) throw new NotFoundError('Course not found');
  return course;
}

export async function listCourses(user: AuthUser) {
  return db
    .select({
      id: courses.id, code: courses.code, name: courses.name, semester: courses.semester,
      color: courses.color, lectureSchedule: courses.lectureSchedule, seminarSchedule: courses.seminarSchedule,
      lectureTeacherId: courses.lectureTeacherId, seminarTeacherId: courses.seminarTeacherId,
      deletedAt: courses.deletedAt,
      enrolled: sql<boolean>`(${userCourses.userId} IS NOT NULL)::boolean`,
    })
    .from(courses)
    .leftJoin(userCourses, and(eq(userCourses.courseId, courses.id), eq(userCourses.userId, user.id)))
    .where(isNull(courses.deletedAt));
}

export async function listTeachingCourses(user: AuthUser) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const courseList = await db.select().from(courses).where(and(eq(courses.lectureTeacherId, user.id), isNull(courses.deletedAt)));
  const counts = await Promise.all(
    courseList.map(async (c) => {
      const [{ count: cnt }] = await db.select({ count: sql<number>`count(*)::int` }).from(userCourses).where(eq(userCourses.courseId, c.id));
      return { courseId: c.id, count: cnt };
    })
  );
  return courseList.map((c) => ({ ...c, studentCount: counts.find((ct) => ct.courseId === c.id)?.count ?? 0 }));
}

export async function listEnrolledCourses(user: AuthUser) {
  return db
    .select({ id: courses.id, code: courses.code, name: courses.name, semester: courses.semester, color: courses.color, lectureSchedule: courses.lectureSchedule, seminarSchedule: courses.seminarSchedule, lectureTeacherId: courses.lectureTeacherId, seminarTeacherId: courses.seminarTeacherId, deletedAt: courses.deletedAt })
    .from(courses)
    .innerJoin(userCourses, and(eq(userCourses.courseId, courses.id), eq(userCourses.userId, user.id)))
    .where(isNull(courses.deletedAt));
}

export async function createCourse(user: AuthUser, body: CreateCourseInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const [course] = await db
    .insert(courses)
    .values({
      code: body.code, semester: body.semester, name: body.name, color: body.color,
      lectureSchedule: body.lectureSchedule, seminarSchedule: body.seminarSchedule,
      lectureTeacherId: body.lectureTeacherId ?? user.id, seminarTeacherId: body.seminarTeacherId,
    })
    .returning();
  await logAction(db, user.id, `Created course ${course.id}: ${course.code}`);
  return course;
}

export async function getCourse(user: AuthUser, courseId: number) {
  const course = await requireCourse(courseId);
  const [{ count: cnt }] = await db.select({ count: sql<number>`count(*)::int` }).from(userCourses).where(eq(userCourses.courseId, course.id));
  const teacher = course.lectureTeacherId
    ? await db.select({ name: userProfiles.name, avatar: userProfiles.avatar }).from(userProfiles).where(eq(userProfiles.userId, course.lectureTeacherId)).then((r) => r[0] ?? null)
    : null;
  const [enrollment] = await db.select({ userId: userCourses.userId }).from(userCourses).where(and(eq(userCourses.courseId, course.id), eq(userCourses.userId, user.id)));
  return { ...course, enrolledCount: cnt, teacherName: teacher?.name ?? null, teacherAvatar: teacher?.avatar ?? null, enrolled: !!enrollment };
}

export async function updateCourse(user: AuthUser, courseId: number, body: UpdateCourseInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const existing = await requireCourse(courseId);
  if (existing.lectureTeacherId !== user.id) throw new ForbiddenError('Only the lecture teacher can update this course');
  const [updated] = await db
    .update(courses)
    .set({
      ...(body.code !== undefined && { code: body.code }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.semester !== undefined && { semester: body.semester }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.lectureSchedule !== undefined && { lectureSchedule: body.lectureSchedule }),
      ...(body.seminarSchedule !== undefined && { seminarSchedule: body.seminarSchedule }),
      ...(body.lectureTeacherId !== undefined && { lectureTeacherId: body.lectureTeacherId }),
      ...(body.seminarTeacherId !== undefined && { seminarTeacherId: body.seminarTeacherId }),
    })
    .where(eq(courses.id, existing.id))
    .returning();
  await logAction(db, user.id, `Updated course ${existing.id}`);
  return updated;
}

export async function deleteCourse(user: AuthUser, courseId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const existing = await requireCourse(courseId);
  if (existing.lectureTeacherId !== user.id) throw new ForbiddenError('Only the lecture teacher can delete this course');
  await db.update(courses).set({ deletedAt: new Date() }).where(eq(courses.id, existing.id));
  await logAction(db, user.id, `Deleted course ${existing.id}`);
  return { success: true };
}

export async function enrollSelf(user: AuthUser, courseId: number) {
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId === user.id || course.seminarTeacherId === user.id)
    throw new BadRequestError('Teacher cannot enroll in their own course');
  await db.insert(userCourses).values({ userId: user.id, courseId: course.id }).onConflictDoNothing();
  await logAction(db, user.id, `Enrolled in course ${course.id}`);
  return { success: true };
}

export async function unenrollSelf(user: AuthUser, courseId: number) {
  const course = await requireCourse(courseId);
  const deleted = await db.delete(userCourses).where(and(eq(userCourses.courseId, course.id), eq(userCourses.userId, user.id))).returning();
  if (deleted.length === 0) throw new NotFoundError('Not enrolled in this course');
  await logAction(db, user.id, `Unenrolled from course ${course.id}`);
  return { success: true };
}

export async function getCourseProgress(user: AuthUser, courseId: number) {
  const course = await requireCourse(courseId);
  const userTasks = await db.select({ status: tasks.status }).from(tasks).where(and(eq(tasks.userId, user.id), eq(tasks.courseId, course.id), isNull(tasks.deletedAt)));
  const total = userTasks.length;
  const done = userTasks.filter((t) => t.status === 'DONE').length;
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export async function listCourseAssignments(user: AuthUser, courseId: number) {
  const course = await requireCourse(courseId);
  const isTeacher = user.roles.includes('TEACHER') && course.lectureTeacherId === user.id;
  if (!isTeacher) {
    return db
      .select({ id: assignments.id, title: assignments.title, dueDate: assignments.dueDate })
      .from(assignments)
      .innerJoin(tasks, and(eq(tasks.assignmentId, assignments.id), eq(tasks.userId, user.id), isNull(tasks.deletedAt)))
      .where(and(eq(assignments.courseId, courseId), isNull(assignments.deletedAt)));
  }
  return db
    .select({ id: assignments.id, title: assignments.title, description: assignments.description, dueDate: assignments.dueDate, evalType: assignments.evalType, total: count(tasks.id), done: sql<number>`count(case when ${tasks.status} = 'DONE' then 1 end)` })
    .from(assignments)
    .leftJoin(tasks, and(eq(tasks.assignmentId, assignments.id), isNull(tasks.deletedAt)))
    .where(and(eq(assignments.courseId, courseId), isNull(assignments.deletedAt)))
    .groupBy(assignments.id);
}

export async function createCourseAssignment(user: AuthUser, courseId: number, body: CreateAssignmentInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied: you do not teach this course');

  const allEnrolled = await db.select({ userId: userCourses.userId }).from(userCourses).where(eq(userCourses.courseId, course.id));
  const recipients = body.targetUserId ? allEnrolled.filter((e) => e.userId === body.targetUserId) : allEnrolled;
  if (recipients.length === 0) throw new BadRequestError('No eligible students found');

  const deadline = new Date(body.dueDate);
  const assignment = await db.transaction(async (tx) => {
    const [created] = await tx.insert(assignments).values({ courseId: course.id, title: body.title, description: body.description, dueDate: deadline, evalType: body.evalType ?? 'none' }).returning();
    await tx.insert(tasks).values(recipients.map((e) => ({ userId: e.userId, assignmentId: created.id, courseId: course.id, title: body.title, description: body.description })));
    await tx.insert(events).values(recipients.map((e) => ({ userId: e.userId, title: body.title, description: `Deadline for assignment`, startDate: deadline, endDate: deadline, courseId: course.id, type: 'DEADLINE' as const })));
    return created;
  });
  await logAction(db, user.id, `Created assignment ${assignment.id} for course ${courseId}`);
  return assignment;
}

export async function updateCourseAssignment(user: AuthUser, courseId: number, assignmentId: number, body: UpdateAssignmentInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied: you do not teach this course');
  const [existing] = await db.select().from(assignments).where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId), isNull(assignments.deletedAt)));
  if (!existing) throw new NotFoundError('Assignment not found');
  const [updated] = await db
    .update(assignments)
    .set({ ...(body.title && { title: body.title }), ...(body.description !== undefined && { description: body.description }), ...(body.dueDate && { dueDate: new Date(body.dueDate) }), ...(body.evalType && { evalType: body.evalType }) })
    .where(eq(assignments.id, assignmentId))
    .returning();
  await logAction(db, user.id, `Updated assignment ${assignmentId}`);
  return updated;
}

export async function listCourseStudents(user: AuthUser, courseId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied: you do not teach this course');
  const enrolled = await db
    .select({ id: users.id, email: users.email, name: userProfiles.name, avatar: userProfiles.avatar })
    .from(userCourses)
    .innerJoin(users, and(eq(userCourses.userId, users.id), isNull(users.deletedAt)))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(userCourses.courseId, courseId));
  return Promise.all(enrolled.map(async (student) => {
    const [stats] = await db.select({ total: count(tasks.id), done: sql<number>`count(case when ${tasks.status} = 'DONE' then 1 end)` }).from(tasks).where(and(eq(tasks.userId, student.id), eq(tasks.courseId, courseId), isNotNull(tasks.assignmentId), isNull(tasks.deletedAt)));
    return { ...student, total: stats.total, done: stats.done };
  }));
}

export async function getStudentDetail(user: AuthUser, courseId: number, studentId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied');
  return db
    .select({ taskId: tasks.id, status: tasks.status, assignmentId: assignments.id, assignmentTitle: assignments.title, evalType: assignments.evalType, dueDate: tasks.dueDate, evalScore: evals.score, evalFeedback: evals.feedback })
    .from(tasks)
    .innerJoin(assignments, eq(tasks.assignmentId, assignments.id))
    .leftJoin(evals, eq(evals.taskId, tasks.id))
    .where(and(eq(tasks.userId, studentId), eq(tasks.courseId, courseId), isNotNull(tasks.assignmentId), isNull(tasks.deletedAt)));
}

export async function enrollStudent(user: AuthUser, courseId: number, body: EnrollStudentInput) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied: you do not teach this course');
  if (body.userId === user.id) throw new BadRequestError('Teacher cannot add themselves to a course');
  const [targetUser] = await db.select().from(users).where(and(eq(users.id, body.userId), isNull(users.deletedAt)));
  if (!targetUser) throw new NotFoundError('User not found');
  const [existing] = await db.select().from(userCourses).where(and(eq(userCourses.userId, body.userId), eq(userCourses.courseId, courseId)));
  if (existing) throw new ConflictError('User is already enrolled');
  await db.insert(userCourses).values({ userId: body.userId, courseId });
  await logAction(db, user.id, `Enrolled user ${body.userId} in course ${courseId}`);
  return { success: true };
}

export async function listAssignmentSubtasks(user: AuthUser, courseId: number, assignmentId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied');
  return db.select().from(assignmentSubtasks).where(and(eq(assignmentSubtasks.assignmentId, assignmentId), isNull(assignmentSubtasks.deletedAt))).orderBy(assignmentSubtasks.sortOrder, assignmentSubtasks.id);
}

export async function createAssignmentSubtask(user: AuthUser, courseId: number, assignmentId: number, title: string) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied');
  const [subtask] = await db.insert(assignmentSubtasks).values({ assignmentId, title }).returning();
  await logAction(db, user.id, `Added subtask to assignment ${assignmentId}`);
  return subtask;
}

export async function deleteAssignmentSubtask(user: AuthUser, courseId: number, assignmentId: number, subtaskId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied');
  const [existing] = await db.select().from(assignmentSubtasks).where(and(eq(assignmentSubtasks.id, subtaskId), eq(assignmentSubtasks.assignmentId, assignmentId), isNull(assignmentSubtasks.deletedAt)));
  if (!existing) throw new NotFoundError('Subtask not found');
  await db.update(assignmentSubtasks).set({ deletedAt: new Date() }).where(eq(assignmentSubtasks.id, subtaskId));
  await logAction(db, user.id, `Deleted subtask ${subtaskId} from assignment ${assignmentId}`);
  return { success: true };
}

export async function getMyEvals(user: AuthUser, courseId: number) {
  return db
    .select({ assignmentTitle: assignments.title, dueDate: assignments.dueDate, evalType: assignments.evalType, score: evals.score, feedback: evals.feedback, evaluatedAt: evals.evaluatedAt })
    .from(tasks)
    .innerJoin(assignments, and(eq(tasks.assignmentId, assignments.id), isNull(assignments.deletedAt)))
    .innerJoin(evals, eq(evals.taskId, tasks.id))
    .where(and(eq(tasks.userId, user.id), eq(tasks.courseId, courseId), isNull(tasks.deletedAt)))
    .orderBy(sql`${assignments.dueDate} DESC`);
}

export async function listAssignmentStudents(user: AuthUser, courseId: number, assignmentId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied: you do not teach this course');
  const [assignment] = await db.select({ dueDate: assignments.dueDate }).from(assignments).where(and(eq(assignments.id, assignmentId), isNull(assignments.deletedAt)));
  if (!assignment) throw new NotFoundError('Assignment not found');
  const rows = await db
    .select({ taskId: tasks.id, userId: users.id, name: userProfiles.name, email: users.email, avatar: userProfiles.avatar, status: tasks.status, completedAt: tasks.completedAt, evalScore: evals.score, evalFeedback: evals.feedback })
    .from(tasks)
    .innerJoin(users, and(eq(tasks.userId, users.id), isNull(users.deletedAt)))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .leftJoin(evals, eq(evals.taskId, tasks.id))
    .where(and(eq(tasks.assignmentId, assignmentId), eq(tasks.courseId, courseId), isNull(tasks.deletedAt)));
  return rows.map(({ completedAt, ...row }) => ({ ...row, status: row.status === 'DONE' && (completedAt === null || completedAt > assignment.dueDate) ? ('TODO' as const) : row.status }));
}

export async function listCourseEvaluations(user: AuthUser, courseId: number) {
  if (!user.roles.includes('TEACHER')) throw new ForbiddenError('TEACHER role required');
  const course = await requireCourse(courseId);
  if (course.lectureTeacherId !== user.id) throw new ForbiddenError('Access denied');
  const rows = await db
    .select({ taskId: tasks.id, userId: users.id, studentName: userProfiles.name, studentEmail: users.email, studentAvatar: userProfiles.avatar, assignmentId: assignments.id, assignmentTitle: assignments.title, evalType: assignments.evalType, dueDate: assignments.dueDate, status: tasks.status, evalScore: evals.score, evalFeedback: evals.feedback })
    .from(tasks)
    .innerJoin(assignments, eq(tasks.assignmentId, assignments.id))
    .innerJoin(users, and(eq(tasks.userId, users.id), isNull(users.deletedAt)))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .leftJoin(evals, eq(evals.taskId, tasks.id))
    .where(and(eq(tasks.courseId, courseId), isNotNull(tasks.assignmentId), isNull(tasks.deletedAt)));
  return rows.filter((r) => r.evalType !== 'none');
}
```

- [ ] **Step 2: Rewrite `src/routes/courses.ts`**

```ts
import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as CoursesController from '../controllers/courses.controller';

const CreateCourseSchema = z.object({
  code: z.string().min(1), semester: z.string().min(1), name: z.string().optional(),
  color: z.string().optional(), lectureSchedule: z.string().optional(),
  seminarSchedule: z.string().optional(), lectureTeacherId: z.number().optional(),
  seminarTeacherId: z.number().optional(),
});
const UpdateCourseSchema = z.object({
  code: z.string().min(1).optional(), name: z.string().optional(),
  semester: z.string().min(1).optional(), color: z.string().optional(),
  lectureSchedule: z.string().optional(), seminarSchedule: z.string().optional(),
  lectureTeacherId: z.number().optional(), seminarTeacherId: z.number().optional(),
});
const CreateAssignmentSchema = z.object({
  title: z.string().min(1), description: z.string().optional(), dueDate: z.string(),
  evalType: z.enum(['none', 'pass_fail', 'graded']).optional().default('none'),
  targetUserId: z.number().int().positive().optional(),
});
const UpdateAssignmentSchema = z.object({
  title: z.string().min(1).optional(), description: z.string().optional(),
  dueDate: z.string().optional(), evalType: z.enum(['none', 'pass_fail', 'graded']).optional(),
});
const EnrollStudentSchema = z.object({ userId: z.number().int().positive() });

export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;
export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentSchema>;
export type EnrollStudentInput = z.infer<typeof EnrollStudentSchema>;

export const coursesRoutes = new Elysia({ prefix: '/courses' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  .get('/', ({ user }) => CoursesController.listCourses(user as AuthUser))
  .get('/teaching', ({ user }) => CoursesController.listTeachingCourses(user as AuthUser))
  .get('/enrolled', ({ user }) => CoursesController.listEnrolledCourses(user as AuthUser))
  .post('/', ({ user, body }) => CoursesController.createCourse(user as AuthUser, body), zodBody(CreateCourseSchema))
  .get('/:id', ({ user, params }) => CoursesController.getCourse(user as AuthUser, Number(params.id)))
  .patch('/:id', ({ user, params, body }) => CoursesController.updateCourse(user as AuthUser, Number(params.id), body), zodBody(UpdateCourseSchema))
  .delete('/:id', ({ user, params }) => CoursesController.deleteCourse(user as AuthUser, Number(params.id)))
  .post('/:id/enroll', ({ user, params }) => CoursesController.enrollSelf(user as AuthUser, Number(params.id)))
  .delete('/:id/enroll', ({ user, params }) => CoursesController.unenrollSelf(user as AuthUser, Number(params.id)))
  .get('/:id/progress', ({ user, params }) => CoursesController.getCourseProgress(user as AuthUser, Number(params.id)))
  .get('/:id/assignments', ({ user, params }) => CoursesController.listCourseAssignments(user as AuthUser, Number(params.id)))
  .post('/:id/assignments', ({ user, params, body }) => CoursesController.createCourseAssignment(user as AuthUser, Number(params.id), body), zodBody(CreateAssignmentSchema))
  .patch('/:id/assignments/:assignmentId', ({ user, params, body }) => CoursesController.updateCourseAssignment(user as AuthUser, Number(params.id), Number(params.assignmentId), body), zodBody(UpdateAssignmentSchema))
  .get('/:id/students', ({ user, params }) => CoursesController.listCourseStudents(user as AuthUser, Number(params.id)))
  .get('/:id/students/:studentId', ({ user, params }) => CoursesController.getStudentDetail(user as AuthUser, Number(params.id), Number(params.studentId)))
  .post('/:id/students', ({ user, params, body }) => CoursesController.enrollStudent(user as AuthUser, Number(params.id), body), zodBody(EnrollStudentSchema))
  .get('/:id/assignments/:assignmentId/subtasks', ({ user, params }) => CoursesController.listAssignmentSubtasks(user as AuthUser, Number(params.id), Number(params.assignmentId)))
  .post('/:id/assignments/:assignmentId/subtasks', ({ user, params, body }) => CoursesController.createAssignmentSubtask(user as AuthUser, Number(params.id), Number(params.assignmentId), body.title), zodBody(z.object({ title: z.string().min(1) })))
  .delete('/:id/assignments/:assignmentId/subtasks/:subtaskId', ({ user, params }) => CoursesController.deleteAssignmentSubtask(user as AuthUser, Number(params.id), Number(params.assignmentId), Number(params.subtaskId)))
  .get('/:id/my-evals', ({ user, params }) => CoursesController.getMyEvals(user as AuthUser, Number(params.id)))
  .get('/:id/assignments/:assignmentId/students', ({ user, params }) => CoursesController.listAssignmentStudents(user as AuthUser, Number(params.id), Number(params.assignmentId)))
  .get('/:id/evaluations', ({ user, params }) => CoursesController.listCourseEvaluations(user as AuthUser, Number(params.id)));
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && bun test
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/controllers/courses.controller.ts apps/backend/src/routes/courses.ts
git commit -m "refactor: extract courses controller"
```

---

## Final verification

- [ ] **Run full test suite**

```bash
cd apps/backend && bun test
```

Expected: all tests pass

- [ ] **TypeScript check**

```bash
cd apps/backend && bun run tsc --noEmit
```

Expected: no errors

- [ ] **Start server and confirm it boots**

```bash
cd apps/backend && bun run dev
```

Expected: `Backend running at http://localhost:3001`