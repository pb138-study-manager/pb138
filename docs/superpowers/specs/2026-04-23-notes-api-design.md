# Notes API Design

**Goal:** CRUD API for personal notes — same auth/ownership/soft-delete/audit pattern as Tasks and Events. No date logic. Simplest resource in the system.

**Architecture:** Single route file (`routes/notes.ts`) plugged into the main Elysia app via `.use()`. Auth, DB, and audit logging reuse existing infrastructure unchanged.

**Tech Stack:** ElysiaJS, Drizzle ORM, Bun test, PostgreSQL, Supabase JWT auth

---

## Schema

Uses the existing `notes` table (already in `schema.ts`):

| Column | Type | Constraints |
|---|---|---|
| id | serial | PK |
| user_id | integer | NOT NULL, FK → users.id |
| title | text | NOT NULL |
| description | text | nullable |
| course_id | integer | nullable, FK → courses.id (future) |
| deleted_at | timestamp | nullable |

> `course_id` is accepted in POST/PATCH bodies and stored but not validated against the courses table — courses are not yet implemented. This avoids a future migration.

---

## Endpoints

### GET /notes
Returns all non-deleted notes belonging to the authenticated user.

- Auth: required
- Query params: none
- Response: `Note[]`

### POST /notes
Creates a new note.

- Auth: required
- Body: `{ title: string (min 1), description?: string, course_id?: number }`
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
- Body: `{ title?: string (min 1), description?: string, course_id?: number }`
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
| 404 | `NOT_FOUND` | Note doesn't exist or belongs to another user |
| 422 | (Elysia default) | Body validation failure (e.g. missing title on POST) |

---

## Files

| File | Action |
|---|---|
| `apps/backend/src/routes/notes.ts` | Create |
| `apps/backend/src/routes/notes.test.ts` | Create |
| `apps/backend/src/index.ts` | Add import + `.use(notesRoutes)` |

---

## Test Plan

~12 tests across 5 describe blocks:

- `GET /notes` — empty list, returns user's notes, does not return other users' notes
- `POST /notes` — creates note, returns it; 422 when title missing; description optional
- `GET /notes/:id` — returns note; 404 for unknown id
- `PATCH /notes/:id` — updates title; updates description; 404 for wrong user
- `DELETE /notes/:id` — soft deletes, disappears from list; 404 on second delete; 404 for wrong user

Each test file uses isolated test user + real JWT (same pattern as `tasks.test.ts` and `events.test.ts`).
