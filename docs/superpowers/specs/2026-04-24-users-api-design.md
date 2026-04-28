# Users API — Design Spec

**Date:** 2026-04-24
**Feature:** Users API (`/users`)
**Branch:** feature/backend-users (to be created from feature/backend-events)

---

## Goal

Implement a 8-endpoint Users API covering profile management, settings, password change, search, and integration status tracking. All endpoints are in a single `routes/users.ts` file registered in `index.ts`.

---

## New DB Table — `user_integrations`

Requires a new migration before implementation.

| Column | Type | Constraints |
|---|---|---|
| id | serial | PK |
| user_id | integer | NOT NULL, FK → users.id |
| service | text | NOT NULL (e.g. `'google_calendar'`) |
| connected | boolean | NOT NULL, DEFAULT false |
| connected_at | timestamp | nullable |
| UNIQUE | (user_id, service) | composite unique |

---

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Yes | Own profile + settings + roles + enrolled courses with teachers + integrations |
| PATCH | `/users/me/profile` | Yes | Update name, title, organization, bio (upsert) |
| PATCH | `/users/me/password` | Yes | Change password via Supabase Admin REST API |
| GET | `/users/me/settings` | Yes | Get UserSettings (returns defaults if row missing) |
| PATCH | `/users/me/settings` | Yes | Upsert UserSettings |
| GET | `/users/search` | Yes (any) | Search users by login/email/name. Query: `?q=` (min 2 chars) |
| POST | `/users/me/integrations/:service` | Yes | Mark a service as connected |
| DELETE | `/users/me/integrations/:service` | Yes | Mark a service as disconnected |

---

## GET /users/me — Response Shape

Built from multiple separate queries (all on primary keys — fast):
1. `users` — base record
2. `user_roles` JOIN `roles` — role names
3. `user_profiles` — nullable, return null fields if missing
4. `user_settings` — nullable, return defaults (`true`, `true`) if missing
5. `user_courses` JOIN `courses` + two aliased LEFT JOINs on `users` for lecture and seminar teachers — Drizzle requires `alias()` helper to join the same table twice
6. `user_integrations` WHERE `connected = true` — only connected services returned

```typescript
{
  id: number,
  email: string,
  login: string,
  roles: string[],
  profile: {
    name: string | null,
    title: string | null,
    organization: string | null,
    bio: string | null,
  },
  settings: {
    notificationsEnabled: boolean,
    lightTheme: boolean,
  },
  enrolledCourses: Array<{
    courseId: number,
    code: string,
    name: string | null,
    lectureTeacher: { id: number, name: string | null, email: string } | null,
    seminarTeacher: { id: number, name: string | null, email: string } | null,
  }>,
  integrations: Array<{
    service: string,
    connectedAt: string,   // only connected services returned
  }>
}
```

> `avatar` field is intentionally omitted — not implemented in this version.

---

## PATCH /users/me/profile

Body (all optional):
```typescript
{ name?: string, title?: string, organization?: string, bio?: string }
```

- Upserts `user_profiles` row (creates if missing, updates if exists)
- Drizzle: `.insert().values(...).onConflictDoUpdate({ target: userProfiles.userId, set: { ... } })`
- Calls `logAction`
- Returns updated profile fields

---

## PATCH /users/me/password

Body:
```typescript
{ newPassword: string }  // minLength: 8
```

- No `currentPassword` required — user is already authenticated via JWT
- Calls Supabase Admin REST API directly via `fetch`:
  ```
  PATCH https://<SUPABASE_URL>/auth/v1/admin/users/<authId>
  Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
  Content-Type: application/json
  Body: { "password": "<newPassword>" }
  ```
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` read from env vars
- On Supabase error → return 500 with `{ error: 'PASSWORD_CHANGE_FAILED' }`
- Calls `logAction` on success
- Returns `{ success: true }`
- **Not tested in automated tests** — would call real Supabase in CI. Marked `// TODO: test manually`.

---

## GET /users/me/settings

- Returns `user_settings` row for current user
- If row doesn't exist, returns defaults: `{ notificationsEnabled: true, lightTheme: true }`
- Does not create the row (lazy — PATCH creates it)

---

## PATCH /users/me/settings

Body (all optional):
```typescript
{ notificationsEnabled?: boolean, lightTheme?: boolean }
```

- Upserts `user_settings` row
- Calls `logAction`
- Returns updated settings

---

## GET /users/search

Query: `?q=<string>` (minimum 2 characters — return 400 if shorter)

- Searches `users.login`, `users.email`, `user_profiles.name` using `ILIKE %q%`
- LEFT JOIN `user_profiles` (name may not exist)
- Excludes soft-deleted users (`isNull(users.deletedAt)`)
- Returns: `Array<{ id, login, email, name: string | null }>`
- Any authenticated user (no role restriction)
- No pagination — results capped at 20

---

## POST /users/me/integrations/:service

- Upserts `user_integrations` row: `{ connected: true, connectedAt: new Date() }`
- Uses `.onConflictDoUpdate()`
- Returns `{ success: true }`
- No `logAction` (not a data mutation, just a preference flag)

---

## DELETE /users/me/integrations/:service

- Looks up `user_integrations` row for `(userId, service)`
- If not found → 404
- Sets `connected = false`, `connectedAt = null`
- Returns `{ success: true }`

---

## File Map

| File | Action |
|---|---|
| `apps/backend/src/db/schema.ts` | Add `userIntegrations` table |
| `apps/backend/drizzle/` | New migration (generated) |
| `apps/backend/src/routes/users.ts` | Create — 8 endpoints |
| `apps/backend/src/routes/users.test.ts` | Create — ~12 tests |
| `apps/backend/src/index.ts` | Register `usersRoutes` |

---

## Test Plan (~12 tests)

```
GET /users/me
  ✓ returns correct shape with empty arrays for new user
  ✓ returns enrolled courses with lecture/seminar teachers after enrollment

PATCH /users/me/profile
  ✓ creates profile row on first call (upsert)
  ✓ updates fields on second call

GET /users/me/settings
  ✓ returns defaults when no settings row exists

PATCH /users/me/settings
  ✓ upserts settings and returns updated values

PATCH /users/me/password
  // TODO: test manually against real Supabase instance

GET /users/search
  ✓ returns matching user by login
  ✓ returns empty array for no match
  ✓ returns 400 when query is under 2 chars

POST /users/me/integrations/:service
  ✓ marks service as connected, appears in GET /users/me

DELETE /users/me/integrations/:service
  ✓ marks service as disconnected
  ✓ returns 404 when service was never connected
```

---

## Key Decisions

- **No avatar:** Deferred — would require file upload handling.
- **No currentPassword on password change:** User is already JWT-authenticated; sufficient for university project scope.
- **Search open to all authenticated users:** No MENTOR/TEACHER restriction — simplifies frontend use.
- **Integrations as connected/disconnected flag only:** No OAuth tokens stored — just a status marker for UI display.
- **Integrations cap at known services:** No validation on `:service` value — any string accepted. Frontend is responsible for sending valid service names.
- **Search capped at 20 results:** No pagination — search is a helper for finding users, not a full directory.
