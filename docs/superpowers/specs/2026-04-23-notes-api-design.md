# Notes API Design

**Goal:** CRUD API for personal notes with optional folder organization — same auth/ownership/soft-delete/audit pattern as Tasks and Events. No date logic.

**Architecture:** Two route files (`routes/notes.ts`, `routes/folders.ts`) plugged into the main Elysia app via `.use()`. Auth, DB, and audit logging reuse existing infrastructure unchanged.

**Tech Stack:** ElysiaJS, Drizzle ORM, Bun test, PostgreSQL, Supabase JWT auth

---

## Schema

### `folders` table (new)

| Column | Type | Constraints |
|---|---|---|
| id | serial | PK |
| user_id | integer | NOT NULL, FK → users.id |
| name | text | NOT NULL |
| deleted_at | timestamp | nullable |

### `notes` table (existing — add two columns)

| Column | Type | Constraints |
|---|---|---|
| id | serial | PK |
| user_id | integer | NOT NULL, FK → users.id |
| title | text | NOT NULL |
| description | text | nullable |
| folder_id | integer | nullable, FK → folders.id |
| course_id | integer | nullable, FK → courses.id (future) |
| deleted_at | timestamp | nullable |

> `course_id` is accepted in POST/PATCH bodies and stored but not validated against courses table — courses are not yet implemented.

> Folders are flat — no nesting.

---

## Folders Endpoints (`/folders`)

### GET /folders
Returns all non-deleted folders belonging to the authenticated user.

- Auth: required
- Response: `Folder[]`

### POST /folders
Creates a new folder.

- Auth: required
- Body: `{ name: string (min 1) }`
- Response: created `Folder`
- Side effect: `logAction` — `"Created folder {id}: {name}"`

### PATCH /folders/:id
Renames a folder.

- Auth: required
- Body: `{ name: string (min 1) }`
- Ownership check (404 if not found/not owned)
- Response: updated `Folder`
- Side effect: `logAction` — `"Updated folder {id}"`

### DELETE /folders/:id
Soft-deletes a folder. Notes inside become unfoldered (folder_id set to null).

- Auth: required
- Ownership check (404 if not found/not owned)
- First: `UPDATE notes SET folder_id = NULL WHERE folder_id = {id}`
- Then: `UPDATE folders SET deleted_at = now() WHERE id = {id}`
- Response: `{ success: true }`
- Side effect: `logAction` — `"Deleted folder {id}"`

---

## Notes Endpoints (`/notes`)

### GET /notes
Returns all non-deleted notes belonging to the authenticated user.

- Auth: required
- Query params: none
- Response: `Note[]`

### POST /notes
Creates a new note.

- Auth: required
- Body: `{ title: string (min 1), description?: string, folder_id?: number, course_id?: number }`
- Response: created `Note`
- Side effect: `logAction` — `"Created note {id}: {title}"`

### GET /notes/:id
Returns a single note by ID.

- Auth: required
- Ownership enforced: returns 404 if note doesn't exist or belongs to another user
- Response: `Note`

### PATCH /notes/:id
Partially updates a note.

- Auth: required
- Body: `{ title?: string (min 1), description?: string, folder_id?: number, course_id?: number }`
- Ownership check first (404 if not found/not owned)
- Only provided fields are updated (conditional spreads)
- Response: updated `Note`
- Side effect: `logAction` — `"Updated note {id}"`

### DELETE /notes/:id
Soft-deletes a note.

- Auth: required
- Ownership check (404 if not found/not owned)
- Sets `deleted_at = now()`, does NOT hard-delete
- Response: `{ success: true }`
- Side effect: `logAction` — `"Deleted note {id}"`

---

## Error Responses

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 404 | `NOT_FOUND` | Resource doesn't exist or belongs to another user |
| 422 | (Elysia default) | Body validation failure |

---

## Files

| File | Action |
|---|---|
| `apps/backend/src/db/schema.ts` | Add `folders` table, add `folder_id` + `course_id` to `notes` |
| `apps/backend/src/routes/folders.ts` | Create — 4 endpoints |
| `apps/backend/src/routes/notes.ts` | Create — 5 endpoints |
| `apps/backend/src/routes/folders.test.ts` | Create |
| `apps/backend/src/routes/notes.test.ts` | Create |
| `apps/backend/src/index.ts` | Add imports + `.use(foldersRoutes)` + `.use(notesRoutes)` |

---

## Test Plan

### folders.test.ts (~10 tests)
- `GET /folders` — empty list; returns user's folders
- `POST /folders` — creates folder; 422 when name missing
- `PATCH /folders/:id` — renames; 404 for wrong user
- `DELETE /folders/:id` — soft deletes; notes become unfoldered; 404 on second delete

### notes.test.ts (~14 tests)
- `GET /notes` — empty list; returns user's notes
- `POST /notes` — creates note; description optional; folder_id optional; 422 when title missing
- `GET /notes/:id` — returns note; 404 for unknown id
- `PATCH /notes/:id` — updates title; updates folder_id; 404 for wrong user
- `DELETE /notes/:id` — soft deletes, disappears from list; 404 on second delete; 404 for wrong user

Each test file uses an isolated test user + real JWT (same pattern as `tasks.test.ts` and `events.test.ts`).
