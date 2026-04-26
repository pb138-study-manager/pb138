# Groups API Design Spec

**Date:** 2026-04-26
**Feature:** Groups and Assignments backend API
**Branch:** feature/backend-events

---

## Overview

Groups allow users to collaborate. Any authenticated user can create a group. The group type (`SEMINAR` or `GROUP`) is determined automatically at creation based on the creator's TEACHER role:

- **SEMINAR** — created by a user with the TEACHER role. Intended for course seminars where a teacher manages students and can evaluate their tasks.
- **GROUP** — created by any other user. Intended for student project groups.

Both types support members and assignments. Evaluation of tasks (via `POST /tasks/:id/eval`) is already gated to TEACHER/MENTOR role on the tasks API — no change needed there.

Emails are **out of scope** for this implementation — skipped intentionally, to be added later.

---

## Schema Changes

### New enum

```typescript
export const groupTypeEnum = pgEnum('group_type', ['SEMINAR', 'GROUP']);
```

### Modified table: `groups`

Add one column:

```typescript
type: groupTypeEnum('type').notNull().default('GROUP'),
```

Type is set at creation and never changes. Requires one migration (generate + apply).

---

## Endpoints

Single file: `apps/backend/src/routes/groups.ts`, registered as `.use(groupsRoutes)` in `index.ts`.

| Method | Path | Auth | Who | Description |
|---|---|---|---|---|
| `GET` | `/groups` | Yes | Any | List groups where user is mentor OR member |
| `POST` | `/groups` | Yes | Any | Create group; type auto-set from creator's role |
| `GET` | `/groups/:id` | Yes | Member or mentor | Group detail + members list |
| `DELETE` | `/groups/:id` | Yes | Mentor only | Soft delete own group |
| `POST` | `/groups/:id/members` | Yes | Mentor only | Add members `{ userIds: number[] }` |
| `DELETE` | `/groups/:id/members/:userId` | Yes | Mentor only | Remove one member |
| `GET` | `/groups/:id/assignments` | Yes | Member or mentor | List assignments for group |
| `POST` | `/groups/:id/assignments` | Yes | Mentor only | Create assignment → one task per member |

### Authorization rules

- **Mentor** = the user who created the group (`groups.mentorId === user.id`)
- Mentor-only actions: delete group, add/remove members, create assignments
- Member-or-mentor actions: view group detail, list assignments
- Mentor check is done per-request against DB (not via role enum)
- Non-members get 403 on group detail and assignments

### Assignment creation

`POST /groups/:id/assignments` body: `{ title, dueDate, description? }`

1. Insert one row into `assignments` (linked to `groupId`)
2. Fetch all current `group_members` for the group
3. Insert one row into `tasks` per member — all share the same `assignmentId`, `dueDate`, `title`, `description`
4. Audit log the action

---

## Response Shapes

### `GET /groups`
```json
[
  {
    "id": 1,
    "name": "PB138 Seminar A",
    "type": "SEMINAR",
    "mentorId": 3,
    "memberCount": 5,
    "deletedAt": null
  }
]
```

### `GET /groups/:id`
```json
{
  "id": 1,
  "name": "PB138 Seminar A",
  "type": "SEMINAR",
  "mentorId": 3,
  "members": [
    { "id": 7, "login": "student1", "email": "s1@muni.cz" }
  ],
  "deletedAt": null
}
```

### `GET /groups/:id/assignments`
```json
[
  {
    "id": 1,
    "groupId": 1,
    "title": "Lab 3",
    "description": "Submit by Friday",
    "dueDate": "2026-04-30T23:59:00.000Z",
    "deletedAt": null
  }
]
```

### `POST /groups/:id/assignments` response
```json
{
  "assignment": { "id": 1, "groupId": 1, "title": "Lab 3", ... },
  "tasksCreated": 5
}
```

---

## Testing Strategy

~13 tests, real DB, JWT tokens, full `beforeAll`/`afterAll` cleanup.

| Test | Verifies |
|---|---|
| `GET /groups` — user sees own groups | Returns groups where user is mentor or member |
| `POST /groups` — TEACHER creates SEMINAR | `type === 'SEMINAR'` |
| `POST /groups` — regular user creates GROUP | `type === 'GROUP'` |
| `GET /groups/:id` — returns members array | Shape + member list |
| `GET /groups/:id` — 403 for non-member | Isolation |
| `DELETE /groups/:id` — mentor can delete | `deletedAt` is set |
| `DELETE /groups/:id` — non-mentor gets 403 | Ownership guard |
| `POST /groups/:id/members` — adds members | Member count increases |
| `DELETE /groups/:id/members/:userId` — removes member | Member count decreases |
| `DELETE /groups/:id/members/:userId` — 404 if not a member | Edge case |
| `GET /groups/:id/assignments` — lists assignments | Returns array |
| `POST /groups/:id/assignments` — creates N tasks | One task per member, all share `assignmentId` |
| `POST /groups/:id/assignments` — non-mentor gets 403 | Ownership guard |

---

## File Map

| File | Action |
|---|---|
| `apps/backend/src/db/schema.ts` | Add `groupTypeEnum`, add `type` column to `groups` |
| `apps/backend/drizzle/` | New migration (generate + apply) |
| `apps/backend/src/routes/groups.ts` | Create — 8 endpoints |
| `apps/backend/src/routes/groups.test.ts` | Create — ~13 tests |
| `apps/backend/src/index.ts` | Add `import + .use(groupsRoutes)` |

---

## Out of Scope

- Email notifications on member add/remove (deferred)
- Admin management of groups (covered by admin API later)
- Frontend UI (separate feature)
