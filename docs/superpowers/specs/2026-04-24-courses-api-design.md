# Courses API Design

**Goal:** CRUD API for shared university courses with enrollment and progress tracking — role-based access (TEACHER role for creation/management), same auth/soft-delete/audit pattern as Tasks, Events, Notes.

**Architecture:** Single route file (`routes/courses.ts`) with 9 endpoints, registered in `index.ts` via `.use()`. Role and ownership checks done inline. Schema is already migrated — `courses` and `user_courses` tables exist, `courseId` FK is already on `tasks`, `events`, and `notes`.

**Tech Stack:** ElysiaJS, Drizzle ORM, Bun test, PostgreSQL, Supabase JWT auth

---

## Schema (already migrated)

### `courses` table

| Column | Type | Constraints |
|---|---|---|
| id | serial | PK |
| code | text | NOT NULL, UNIQUE (e.g. `'PB138'`) |
| name | text | nullable |
| semester | text | NOT NULL (e.g. `'Spring 2026'`) |
| color | text | nullable (hex) |
| lecture_schedule | text | nullable (e.g. `'Mon 10:00-12:00'`) |
| seminar_schedule | text | nullable (e.g. `'Thu 14:00-16:00'`) |
| lecture_teacher_id | integer | nullable, FK → users.id |
| seminar_teacher_id | integer | nullable, FK → users.id |
| deleted_at | timestamp | nullable |

### `user_courses` table (enrollment junction)

| Column | Type | Constraints |
|---|---|---|
| user_id | integer | FK → users.id |
| course_id | integer | FK → courses.id |
| PK | (user_id, course_id) | composite |

---

## Endpoints (`/courses`)

### GET /courses
Returns all non-deleted courses, each with an `enrolled` boolean indicating whether the current user is enrolled.

- Auth: required
- Response: `Array<Course & { enrolled: boolean }>`
- Implementation: LEFT JOIN `user_courses` on `courseId = id AND userId = current user`, map to add `enrolled` flag

### GET /courses/enrolled
Returns only courses the current user is enrolled in (non-deleted). Used for dashboard/sidebar.

- Auth: required
- Response: `Course[]`
- Implementation: INNER JOIN `user_courses` on `courseId = id AND userId = current user`, filter `isNull(courses.deletedAt)`

### POST /courses
Creates a new course. Requires TEACHER role.

- Auth: required, TEACHER role
- Body: `{ code: string (min 1), semester: string (min 1), name?: string, color?: string, lectureSchedule?: string, seminarSchedule?: string, lectureTeacherId?: number, seminarTeacherId?: number }`
- If `lectureTeacherId` is not provided, defaults to the current user's id
- Response: created `Course`
- Side effect: `logAction` — `"Created course {id}: {code}"`

### GET /courses/:id
Returns a single course by ID with enrolled student count.

- Auth: required
- Response: `Course & { enrolledCount: number }`
- 404 if not found or soft-deleted
- Implementation: fetch course, count rows in `user_courses` where `courseId = id`

### PATCH /courses/:id
Partially updates a course. Requires TEACHER role and must be the lecture teacher of this course.

- Auth: required, TEACHER role
- Ownership check: `course.lectureTeacherId === user.id` — 403 if not the lecture teacher, 404 if course not found/deleted
- Body: `{ code?: string (min 1), name?: string, semester?: string (min 1), color?: string, lectureSchedule?: string, seminarSchedule?: string, lectureTeacherId?: number, seminarTeacherId?: number }`
- Only provided fields are updated (conditional spreads)
- Response: updated `Course`
- Side effect: `logAction` — `"Updated course {id}"`

### DELETE /courses/:id
Soft-deletes a course. Requires TEACHER role and must be the lecture teacher.

- Auth: required, TEACHER role
- Ownership check: `course.lectureTeacherId === user.id` — 403 if not the lecture teacher, 404 if not found/deleted
- Sets `deletedAt = now()`
- Response: `{ success: true }`
- Side effect: `logAction` — `"Deleted course {id}"`

### POST /courses/:id/enroll
Enrolls the current user in a course. Idempotent — if already enrolled, returns `{ success: true }` silently.

- Auth: required
- 404 if course not found or soft-deleted
- Implementation: INSERT INTO `user_courses` (userId, courseId) ON CONFLICT DO NOTHING
- Response: `{ success: true }`

### DELETE /courses/:id/enroll
Unenrolls the current user from a course.

- Auth: required
- 404 if course not found/deleted, or if user is not enrolled
- Implementation: DELETE from `user_courses` where `userId = current AND courseId = id`
- Tasks, notes, and events with `courseId` are left untouched
- Response: `{ success: true }`

### GET /courses/:id/progress
Returns task completion stats for the current user in this course.

- Auth: required
- 404 if course not found or soft-deleted
- Response: `{ total: number, done: number, percent: number }`
- Implementation: count user's non-deleted tasks where `courseId = id`; `percent = total === 0 ? 0 : Math.round(done / total * 100)`

---

## Role & Ownership Rules

| Endpoint | Role required | Ownership required |
|---|---|---|
| GET /courses | any | — |
| GET /courses/enrolled | any | — |
| POST /courses | TEACHER | — |
| GET /courses/:id | any | — |
| PATCH /courses/:id | TEACHER | `lectureTeacherId === user.id` |
| DELETE /courses/:id | TEACHER | `lectureTeacherId === user.id` |
| POST /courses/:id/enroll | any | — |
| DELETE /courses/:id/enroll | any | own enrollment only |
| GET /courses/:id/progress | any | own tasks only |

---

## Error Responses

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Authenticated TEACHER but not the lecture teacher of this course |
| 404 | `NOT_FOUND` | Course not found, deleted, or user not enrolled |
| 422 | (Elysia default) | Body validation failure |

---

## Files

| File | Action |
|---|---|
| `apps/backend/src/routes/courses.ts` | Create — 9 endpoints |
| `apps/backend/src/routes/courses.test.ts` | Create — ~18 tests |
| `apps/backend/src/index.ts` | Modify — import + `.use(coursesRoutes)` |

---

## Test Plan (~18 tests)

### GET /courses
- Returns all courses with `enrolled: false` for a new user
- Returns `enrolled: true` after enrolling

### GET /courses/enrolled
- Returns empty array when not enrolled in any course
- Returns enrolled courses after enrolling

### POST /courses
- Creates course (TEACHER user), `lectureTeacherId` defaults to current user
- Returns 403 when called by non-TEACHER user

### GET /courses/:id
- Returns course with `enrolledCount`
- Returns 404 for unknown id

### PATCH /courses/:id
- Updates fields (lecture teacher)
- Returns 403 when called by a different TEACHER
- Returns 404 for unknown course

### DELETE /courses/:id
- Soft-deletes course (lecture teacher)
- Returns 403 for different TEACHER
- Course disappears from GET /courses after delete

### POST /courses/:id/enroll
- Enrolls user, appears in GET /courses/enrolled
- Idempotent — second enroll returns 200

### DELETE /courses/:id/enroll
- Unenrolls user, disappears from GET /courses/enrolled
- Returns 404 when not enrolled

### GET /courses/:id/progress
- Returns `{ total: 0, done: 0, percent: 0 }` with no tasks
- Returns correct counts with tasks linked to course

Each test file uses an isolated test user (+ isolated TEACHER user) with real JWT — same pattern as `tasks.test.ts`, `events.test.ts`.
