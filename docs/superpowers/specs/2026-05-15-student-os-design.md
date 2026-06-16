# Student OS — Design Spec

**Date:** 2026-05-15
**Status:** Approved
**Branch:** merge-be-fe

---

## Vision

Transform the PB138 Study Manager into a **Student OS** — an all-in-one hub for university student life, powered by an AI copilot and a first-class teacher-student communication layer. The app should feel like the single place a student opens every morning and a teacher opens before every class.

The three pillars:

1. **All-in-one hub** — tasks, notes, courses, timeline, and teacher assignments unified in one place
2. **Full AI copilot** — an AI that knows your academic life: deadlines, workload, notes, and courses, and proactively helps you manage it
3. **Teacher-student channel** — teachers assign people to courses, publish study materials and tasks to all enrolled students, and evaluate submitted work

---

## What the App Evolved From

The existing app already has:

- Task management with subtasks
- Notes with folders
- Courses (mock data)
- Timeline/events
- Teacher/mentor role in DB schema
- Assignments and evaluations in schema
- Backend routes: auth, tasks, events, notes, folders, groups, courses, users (all with tests)
- Zod validation throughout the backend
- Mobile-first UI: sidebar + bottom nav
- Database hosted on Supabase (PostgreSQL)

The redesign **evolves** this — no rebuild. New features are layered on top. Existing backend and components are preserved.

---

## App Shell

**Layout:** Sidebar (left) + main content (center) + collapsible AI panel (right)

- Desktop: all three panels visible, AI panel collapses to icon
- Mobile: bottom nav + AI accessible as a tab

**Role toggle:** Toggle switch na stránke `/profile` (Settings sekcia) — `Teacher Mode` on/off. Viditeľný pre všetkých prihlásených. Sidebar a bottom nav reagujú na kombináciu `mode === 'teacher'` (z `roleMode` v localStorage) + `isTeacher` (z `/users/me` roles). Sidebar pill ako samostatný prvok nie je implementovaný.

**Dark mode:** Persisted in `user_settings.light_theme`, toggled via `dark` class on `<html>`.

---

## Information Architecture

### Student Navigation

| Section          | What it contains                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------- |
| 🏠 Today         | AI-curated daily view · week strip · tasks for today · upcoming deadlines                 |
| ✅ Tasks         | Personal tasks + subtasks · AI priority scoring · teacher-assigned tasks tagged by course |
| 📚 Courses       | Enrolled courses · progress per course · study materials from teacher · course tasks      |
| 📝 Notes         | Personal notes · folders · linkable to courses · AI summarization                         |
| 📅 Timeline      | Events · course deadlines · AI-suggested study blocks                                     |
| 🤖 AI Copilot    | Chat · weekly plan generator · proactive feed · note summaries                            |
| ⋯ More           | Catch-all drawer for smaller features (links, settings shortcuts, etc.)                   |
| 👤 Profile       | Avatar · password · theme · notifications · language                                      |
| 🔔 Bell (header) | Hard notifications: new assignment, new material, evaluation received                     |

### Teacher Navigation

| Section            | What it contains                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------- |
| 🏫 My Classes      | Courses you teach · class roster · today's sessions · pending evaluations badge           |
| 📋 Assignments     | Create & manage assignments · assign to course · set due dates · track submission status  |
| 📊 Evaluations     | Grade submitted work · score + feedback · per-student progress view                       |
| 📦 Study Materials | Upload/link materials to courses · visible to enrolled students · organized by topic      |
| 👥 Students        | Enroll / remove students per course · search by name/email · view per-student task status |
| 🤖 AI Insights     | Class performance overview · students falling behind · AI-drafted assignment descriptions |
| 👤 Profile         | Same as student profile                                                                   |

---

## Teacher-Student Communication Flow

1. Teacher creates a course → sets lecture/seminar schedule, adds enrolled students
2. Teacher publishes an assignment (title, description, due date, target course)
3. System auto-creates one task per enrolled student, linked to that assignment and course
4. Task appears in student's Tasks list tagged with course name + "From teacher"
5. Student completes the task, marks it done
6. Teacher evaluates with score + feedback → stored in `evals` table → student notified

**Study Materials:**

- Teacher attaches files/links to a course
- Students see them in the Courses → course detail page
- New material triggers an in-app notification

**Privacy rule:** Student personal data (notes, private tasks, chat history) is never visible to teachers — not through the UI, not through AI.

---

## AI Copilot

### What the AI knows (student context)

- Tasks + due dates + completion status
- Enrolled courses + schedule
- Notes content (titles + descriptions)
- Task completion history (for trend analysis)
- Timeline events

### AI Modes

**Proactive Feed (default panel state)**
The AI panel shows contextual cards without being asked:

- Overload warning: "5 tasks + 2 exams this week — you're overloaded"
- Priority nudge: "PB138 project due in 3 days, still TODO"
- Progress celebration: "8 tasks done this week — 60% more than last week"
- Note summary: "Your PB138 notes cover REST, auth, Drizzle ORM"

Cards have action buttons: "Yes, reschedule", "Generate plan", etc.
Styling: polished cards with colored left-border accents, not a raw list.

**Chat Mode**
Full chat interface. Student asks anything:

- "What should I study today?"
- "Summarize my PB162 notes"
- "Am I on track for this week?"

AI responds with context from the student's actual data.

**Weekly Plan Generator**
Triggered from chat or a panel button. AI reads:

- All tasks + deadlines for the coming week
- Timeline events (exams, seminars)
- Generates a day-by-day suggested study schedule
- Student can push it to Timeline with one click

### AI for Teachers

- Class performance: "4 students in PB138 haven't submitted last week's task"
- At-risk detection: students with many overdue tasks
- Assignment drafting: "Draft a description for this assignment"

### Implementation

- Backend: `/ai` route (ElysiaJS) accepts `{ context, prompt }`, calls E-infra AI API (university AI infrastructure), streams response back
- Context is assembled server-side from the authenticated user's data — never raw DB dumps
- Student AI data is scoped to that student only; teacher AI only sees aggregate/anonymized stats

---

## Data Model Changes Needed

The existing schema covers most of this. Additions needed:

**`study_materials`** — new table
| Column | Type | Constraints |
|---|---|---|
| id | serial | PK |
| course_id | integer | NOT NULL, FK → courses.id |
| created_by | integer | NOT NULL, FK → users.id (teacher) |
| title | text | NOT NULL |
| url | text | nullable (external link) |
| description | text | nullable |
| deleted_at | timestamp | nullable |

**`tasks`** — add `course_id` FK (already planned in CLAUDE.md)

**`events`** — add `course_id` FK (already planned in CLAUDE.md)

**`notes`** — add `course_id` FK (already in CLAUDE.md)

**`ai_sessions`** — optional, for persisting chat history
| Column | Type | Constraints |
|---|---|---|
| id | serial | PK |
| user_id | integer | NOT NULL, FK → users.id |
| role | text | NOT NULL ('user' or 'assistant') |
| content | text | NOT NULL |
| created_at | timestamp | NOT NULL, DEFAULT now() |

---

## New API Endpoints

### Study Materials

| Method | Path                            | Auth          | Description               |
| ------ | ------------------------------- | ------------- | ------------------------- |
| GET    | `/courses/:id/materials`        | Yes           | List materials for course |
| POST   | `/courses/:id/materials`        | TEACHER       | Add material              |
| DELETE | `/courses/:id/materials/:matId` | TEACHER (own) | Soft delete material      |

### AI

| Method | Path                  | Auth    | Description                               |
| ------ | --------------------- | ------- | ----------------------------------------- |
| POST   | `/ai/chat`            | Yes     | Send message, get AI response (streaming) |
| POST   | `/ai/plan`            | Yes     | Generate weekly study plan                |
| POST   | `/ai/summarize-notes` | Yes     | Summarize user's notes for a course       |
| GET    | `/ai/insights`        | TEACHER | Get class performance insights            |

### Notifications

| Method | Path                      | Auth | Description                                        |
| ------ | ------------------------- | ---- | -------------------------------------------------- |
| GET    | `/notifications`          | Yes  | List notifications for current user (unread first) |
| PATCH  | `/notifications/:id/read` | Yes  | Mark notification as read                          |
| PATCH  | `/notifications/read-all` | Yes  | Mark all as read                                   |

### Search

| Method | Path               | Auth | Description                                                       |
| ------ | ------------------ | ---- | ----------------------------------------------------------------- |
| GET    | `/search?q=string` | Yes  | Search tasks, notes, courses, materials — results grouped by type |

---

## Frontend Changes

### Existing screens to update

- **Today** — add personalized greeting, AI panel wired up, deadline urgency indicators
- **Tasks** — add "From teacher" tag on teacher-assigned tasks, course badge
- **Courses** — add study materials tab in course detail, real data from API
- **Sidebar** — add role toggle pill, AI panel strip on right

### New screens

- **Teacher: My Classes** — course list with pending eval badges
- **Teacher: Assignments** — create/manage assignments
- **Teacher: Evaluations** — grade submissions
- **Teacher: Study Materials** — upload/link materials
- **Teacher: Students** — enroll/remove per course (teacher-only, no self-enroll)
- **Course detail (student)** — tabbed: Overview · Tasks · Materials · My Grades. Header has course name, schedule, teacher name, progress ring.
- **Notification center** — bell icon in header, dropdown list of recent hard notifications
- **AI Copilot panel** — proactive feed + chat + plan generator (right-side panel component)
- **Notification center** — bell icon in header, unread badge, dropdown list
- **Global search modal** — CMD+K command palette, results grouped by type (tasks / notes / courses / materials)
- **"More" drawer** — Profile/Settings, Groups, Pomodoro timer, About/Help

---

## Gap Resolutions

Decisions made during planning session 2026-05-15:

| Gap                           | Decision                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Course enrollment             | Teacher-only — teachers control the roster, students cannot self-enroll                                                         |
| Student evaluation visibility | Score + feedback visible in task detail AND in a "My Grades" tab inside course detail                                           |
| In-app notifications          | Bell icon in header for hard notifications (new assignment, new material, graded) + AI panel for contextual nudges              |
| "Others" nav section          | Renamed to "More" — catch-all drawer: Profile/Settings, Groups, Pomodoro timer, About/Help                                      |
| Mobile teacher nav            | Same 5-slot structure as student nav, icons shift meaning on role toggle (Classes / Assign / Grades / Students / More)          |
| Course detail page            | Tabbed layout — course header with progress ring, tabs: Overview · Tasks · Materials · My Grades                                |
| Global search                 | CMD+K command palette — single `/search` endpoint queries tasks, notes, courses, materials in parallel, results grouped by type |
| Role assignment               | Admin-only — new users are always STUDENT by default; TEACHER role is granted via the admin panel                               |

---

## Notifications Schema

**`notifications`** — new table
| Column | Type | Constraints |
|---|---|---|
| id | serial | PK |
| user_id | integer | NOT NULL, FK → users.id |
| type | text | NOT NULL (`ASSIGNMENT_CREATED`, `MATERIAL_ADDED`, `TASK_EVALUATED`, `GROUP_INVITE`) |
| title | text | NOT NULL (e.g. "New assignment in PB138") |
| body | text | nullable (e.g. "Project 2 — REST API, due May 30") |
| link | text | nullable (e.g. "/tasks/42" — where to navigate on click) |
| read | boolean | NOT NULL, DEFAULT false |
| created_at | timestamp | NOT NULL, DEFAULT now() |

Bell icon in header shows unread count. Clicking a notification marks it read and navigates to `link`.

---

## "More" Drawer Contents

| Item               | Description                                             |
| ------------------ | ------------------------------------------------------- |
| Profile / Settings | Avatar, password, theme, language, notifications toggle |
| Groups             | Existing mentor/group system (already built)            |
| Pomodoro Timer     | Self-contained focus timer                              |
| About / Help       | App version, support links                              |

---

## Global Search

**Trigger:** CMD+K (desktop) or search icon (mobile)
**Endpoint:** `GET /search?q=string`
**Searches across:** tasks, notes, courses, study materials
**Results:** grouped by type, each result links to the relevant resource
**Implementation:** parallel `ILIKE` queries server-side, single JSON response

---

## What NOT to Build (YAGNI)

- Real-time collaboration on notes
- File upload storage (use URLs/links for study materials for now)
- Push notifications / mobile app
- Pomodoro timer (mentioned in old README description — descoped)
- Grade book / GPA calculator
- Student-to-student messaging

---

## Phased Delivery

**Phase 1 — UX shell + teacher portal**

- Redesign sidebar with role toggle
- Add AI panel strip (proactive feed only, no E-infra AI yet)
- Teacher nav + My Classes + Students screens
- Study materials API + frontend

**Phase 2 — AI integration**

- `/ai` backend routes (E-infra AI API)
- Chat mode in AI panel
- Weekly plan generator
- Note summarization

**Phase 3 — Polish**

- Proactive feed card styling (flagged as important by user)
- Teacher: Evaluations screen
- AI Insights for teachers
- Mobile bottom nav update for new sections
