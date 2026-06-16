# Student OS — PB138

> An all-in-one hub for university student life, powered by an AI copilot and a first-class teacher-student communication layer.

Built as a university project for PB138 — Web Development Principles, Masaryk University Brno.

---

## What is this?

Student OS is the single app a student opens every morning and a teacher opens before every class. Three things make it different from a plain study tracker:

1. **Everything in one place** — tasks, notes, courses, timeline, and teacher-assigned work unified in a single shell
2. **AI copilot** — an AI that knows your deadlines, workload, and notes, and proactively helps you manage your week
3. **Teacher-student channel** — teachers assign students to courses, publish study materials, create assignments for the whole class, and evaluate submitted work

---

## What it can do

### As a Student

- **Today view** — personalized daily screen: week strip, tasks for today, upcoming deadlines, AI summary of your week
- **Tasks** — personal tasks + subtasks, filter by status/due date, AI priority scoring; teacher-assigned tasks appear here automatically tagged with the course
- **Courses** — enrolled courses with progress tracking; each course opens a tabbed detail view:
  - _Overview_ — schedule, teacher info, next class, upcoming deadlines
  - _Tasks_ — all tasks linked to this course
  - _Materials_ — study materials uploaded by the teacher (links + descriptions)
  - _My Grades_ — all evaluations for this course with score + feedback
- **Notes** — personal notes organized in folders, linkable to courses, AI can summarize them on demand
- **Timeline** — calendar view of events and deadlines, AI-suggested study blocks pushed directly from the plan generator
- **AI Copilot** — persistent right-side panel with three modes:
  - _Proactive feed_ — polished cards that warn you about overload, nudge high-priority tasks, celebrate progress
  - _Chat_ — ask anything ("What should I study today?", "Summarize my PB138 notes")
  - _Weekly plan generator_ — AI reads your tasks and calendar, generates a day-by-day study schedule, one click pushes it to Timeline
- **Notifications** — bell icon in the header (unread badge) for hard notifications: new assignment, new material, evaluation received; clicking navigates directly to the relevant resource; AI panel handles contextual nudges separately
- **Global search** — CMD+K command palette searches across tasks, notes, courses, and study materials at once; results grouped by type
- **More** — catch-all drawer: Profile/Settings, Groups, Pomodoro timer, About/Help

### As a Teacher

- **My Classes** — all courses you teach, class roster, today's sessions, count of pending evaluations
- **Assignments** — create assignments for a course, set due date and description (AI can draft it), publish to all enrolled students at once; students cannot self-enroll — teachers control the roster entirely
- **Evaluations** — grade submitted student work with score + feedback, view per-student progress across a course
- **Study Materials** — attach links and descriptions to a course; enrolled students see them in the Materials tab of the course detail
- **Students** — enroll and remove students per course, search by name/email, view each student's task completion status
- **AI Insights** — class performance overview, which students are falling behind, aggregate submission stats

### Role toggle

A user can hold both Student and Teacher roles (e.g. PhD students). A small pill in the sidebar switches the entire navigation context without logging out. On mobile, the same 5-slot bottom nav shifts meaning on role toggle (Today→Classes, Tasks→Assign, Courses→Grades, Notes→Students, More→More).

New users are always **Student** by default. The **Teacher** role is granted exclusively by an Admin via the admin panel — no self-declaration.

---

## How it works

```
Browser
  └── React + TanStack Router (file-based routing)
        ├── Sidebar (role-aware nav) + AI panel strip
        ├── Student screens: Today, Tasks, Courses, Notes, Timeline
        ├── Teacher screens: My Classes, Assignments, Evaluations, Materials, Students
        └── AI Copilot panel (proactive feed / chat / plan generator)

ElysiaJS API (Bun)
  ├── /auth        — register, verify email, login, logout
  ├── /tasks       — CRUD + subtasks + toggle done + eval
  ├── /events      — CRUD events
  ├── /notes       — CRUD notes + folders
  ├── /courses     — enroll, course detail, progress
  │   └── /materials — study materials per course
  ├── /groups      — mentor groups + assignments
  ├── /users       — profile, settings, password
  ├── /admin       — user management, roles, audit logs
  └── /ai          — chat (streaming), weekly plan, note summarize, teacher insights

PostgreSQL via Supabase (Drizzle ORM)
  └── users, tasks, events, notes, courses, assignments, evals,
      study_materials, audit_logs, emails, ...

E-infra AI API (university AI infrastructure)
  └── Powers /ai routes — context assembled server-side from user's own data
      Student data is never visible to teachers through AI
```

---

## Key design decisions

- **Soft delete everywhere** — `deleted_at` column, never hard DELETE
- **Audit log on every mutation** — INSERT/UPDATE/soft-DELETE → `audit_logs`
- **Ownership enforced server-side** — users can only read/modify their own data
- **AI context is scoped** — the AI only sees the authenticated user's data; teacher AI insights use aggregate stats only
- **Teacher assignments auto-create tasks** — publishing an assignment creates one task per enrolled student, linked to the assignment and course
- **Role toggle, not separate logins** — one account can hold multiple roles

---

## Tech Stack

| Layer      | Technology                                     |
| ---------- | ---------------------------------------------- |
| Frontend   | React 18 + TypeScript + Vite + TanStack Router |
| Styling    | Tailwind CSS (dark mode via `class`)           |
| Validation | Zod                                            |
| Backend    | Bun + ElysiaJS + TypeScript                    |
| Database   | PostgreSQL via Supabase                        |
| ORM        | Drizzle ORM                                    |
| Auth       | JWT (`@elysiajs/jwt`)                          |
| AI         | E-infra API (university AI infrastructure)     |
| Testing    | Vitest + Playwright                            |
| CI/CD      | GitHub Actions                                 |

---

## Setup

```bash
pnpm install
pnpm --filter @pb138/frontend dev   # frontend on http://localhost:5173
bun run dev                          # backend on http://localhost:3001 (from apps/backend/)
```

Database is hosted on Supabase — set `DATABASE_URL` in `apps/backend/.env` (see `.env.example`).

### Database

```bash
# From apps/backend/:
bun run db:generate   # generate migration from schema changes
bun run db:migrate    # apply migrations
bun run db:push       # push schema directly (dev only)
```

### Run tests

```bash
pnpm --filter @pb138/frontend test       # Vitest unit tests
pnpm --filter @pb138/frontend test:e2e   # Playwright E2E
bun test                                  # Backend unit tests (from apps/backend/)
```

---

## Repository Structure

```
pb138/
├── apps/
│   ├── backend/
│   │   └── src/
│   │       ├── index.ts           # ElysiaJS server entry
│   │       ├── db/
│   │       │   ├── schema.ts      # All table definitions
│   │       │   └── index.ts       # Drizzle client
│   │       ├── routes/            # One file per resource
│   │       ├── middleware/auth.ts # JWT + role guards
│   │       └── services/          # Email, audit log, scheduler, AI
│   └── frontend/
│       └── src/
│           ├── routes/            # File-based routing (TanStack Router)
│           ├── components/        # Shared UI components
│           ├── hooks/             # Custom hooks
│           └── lib/               # API client, auth context, i18n
├── docs/
│   ├── superpowers/specs/         # Design specs per feature
│   └── analysis/                  # ERD, use case diagrams
├── docker-compose.yml
└── .github/workflows/ci.yml       # lint → test → build → e2e
```

---

## Commit conventions

```
feat: description     # new feature
change: description   # modification to existing feature
fix: description      # bug fix
```

---

## Team

| Name               | UCO    |
| ------------------ | ------ |
| Peter Perveka      | 564577 |
| Valéria Kvaššayová | 550435 |
| Jaroslav Svajčík   | 564578 |
| Martin Boucník     | 564157 |

---

## Diagrams

![Use Case Diagram](./docs/analysis/diagrams/use-case.png)
![ER Diagram](./docs/analysis/diagrams/entity-relationship.png)
