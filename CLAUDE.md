# CLAUDE.md — PB138 Study Manager ("Student OS")

> This file is the single source of truth for Claude Code working on this project.
> Read this entire file before writing any code.

---

## Project Vision

**Student OS** — a full-stack web app where university students manage tasks, notes, courses, and events, and teachers manage classes, assignments, and grades. The guiding metaphor is an OS for academic life: role-aware navigation, AI copilot as connective tissue, everything in one coherent product.

**Architecture approach chosen:** AI-backbone — teacher portal and AI copilot ship together, unified by a persistent AI panel. Student data is never exposed to teachers through AI.

**Team:** 4 members — Peter Perveka (564577), Valéria Kvaššayová (550435), Jaroslav Svajčík (564578), + 1 unnamed  
**Course:** PB138 — Web Development Principles, MU Brno

---

## Tech Stack

### Backend

- **Runtime:** Bun (latest)
- **Framework:** ElysiaJS `^1.0.27`
- **Language:** TypeScript `^5.4.5`
- **ORM:** Drizzle ORM `^0.30.9` + `drizzle-kit ^0.21.1`
- **DB driver:** `postgres ^3.4.4` (postgres.js)
- **Database:** PostgreSQL 16 (Supabase cloud — no local Docker needed)
- **Auth:** Supabase Auth (JWT verified via JWKS — `jose` library, NOT @elysiajs/jwt)
- **Validation:** Zod (`z.object()` + custom `zodBody()` helper in `src/lib/validation.ts`)
- **CORS:** `@elysiajs/cors ^1.0.2`

### Frontend

- **Framework:** React `^18.3.0` + TypeScript `^5.4.5`
- **Build:** Vite `^5.2.12`
- **Routing:** TanStack Router `^1.32.0` (file-based)
- **Auth:** Supabase client (`@supabase/supabase-js`) — handles register/login/verify/session
- **Styling:** Tailwind CSS `^3.4.4` (dark mode: `class` strategy)
- **i18n:** `react-i18next` with EN and CS locales (`src/locales/en.json`, `cs.json`)
- **Testing:** Vitest `^1.6.0` + jsdom, Playwright `^1.44.0`

### Infrastructure

- **Monorepo:** pnpm workspaces
- **Database hosting:** Supabase cloud (PostgreSQL 16) — no local Docker, DB_URL in `.env`
- **CI/CD:** GitHub Actions (lint → test → build → e2e)
- **Linting:** ESLint `^8.57.0` + Prettier `^3.2.5`

### AI (Presentation Sprint)

- **Provider:** E-infra LLM API (`https://llm.ai.e-infra.cz/v1/`) — OpenAI-compatible
- **Package:** `openai` npm package (OpenAI SDK pointed at E-infra base URL)
- **Env vars:** `E_INFRA_API_TOKEN`, `EINFRA_BASE_URL`, `EINFRA_MODEL`
- **Default model:** `llama3.3:latest` (configurable via env)

---

## Repository Structure

```
pb138/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.ts              # Main ElysiaJS server entry — all routes registered here
│   │   │   ├── index.test.ts
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # Drizzle client export
│   │   │   │   ├── schema.ts         # ALL table definitions
│   │   │   │   ├── seed.ts           # Seed roles, permissions, email templates
│   │   │   │   └── seed-user.ts      # Dev user seeding helper
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts           # /auth/sync (Supabase user sync), /auth/logout
│   │   │   │   ├── tasks.ts          # Full CRUD + subtasks (parentId)
│   │   │   │   ├── events.ts         # Full CRUD
│   │   │   │   ├── notes.ts          # Full CRUD
│   │   │   │   ├── folders.ts        # Folder CRUD for notes
│   │   │   │   ├── users.ts          # /users/me profile + settings
│   │   │   │   ├── groups.ts         # Groups + members + assignments
│   │   │   │   └── courses.ts        # Courses + enrollment
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts           # Supabase JWKS verification → { user: AuthUser | null }
│   │   │   ├── services/
│   │   │   │   └── audit.ts          # logAction() helper
│   │   │   └── lib/
│   │   │       └── validation.ts     # zodBody() helper for Zod + Elysia integration
│   │   ├── drizzle/                  # Generated migration files (do not edit)
│   │   ├── drizzle.config.ts
│   │   └── Dockerfile
│   └── frontend/
│       ├── src/
│       │   ├── main.tsx              # React entry + RouterProvider + i18n init
│       │   ├── index.css             # Tailwind directives
│       │   ├── routeTree.gen.ts      # Auto-generated (do not edit)
│       │   ├── locales/
│       │   │   ├── en.json           # English translations
│       │   │   └── cs.json           # Czech translations
│       │   ├── routes/
│       │   │   ├── __root.tsx        # Root layout
│       │   │   ├── index.tsx         # Landing page /
│       │   │   ├── login.tsx         # /login (Supabase)
│       │   │   ├── register.tsx      # /register (Supabase)
│       │   │   ├── verify-email.tsx  # /verify-email
│       │   │   ├── dashboard.tsx     # /dashboard
│       │   │   ├── today/index.tsx   # /today — week strip + tasks (connected to API)
│       │   │   ├── tasks/index.tsx   # /tasks — full task list
│       │   │   ├── notes/
│       │   │   │   ├── index.tsx     # /notes + folders
│       │   │   │   └── $noteId.tsx   # /notes/:noteId
│       │   │   ├── timeline/index.tsx # /timeline
│       │   │   ├── courses/
│       │   │   │   ├── index.tsx     # /courses — connected to API, colored cards + progress bar
│       │   │   │   ├── new.tsx       # /courses/new
│       │   │   │   └── $courseId.tsx # /courses/:courseId
│       │   │   ├── teachers/
│       │   │   │   ├── index.tsx     # /teachers — teacher portal (UI shell)
│       │   │   │   └── new.tsx       # /teachers/new
│       │   │   ├── profile/index.tsx # /profile
│       │   │   ├── custom-nav.tsx    # Custom navigation editor
│       │   │   ├── others/index.tsx  # Catch-all "More" drawer
│       │   │   └── admin/
│       │   │       ├── index.tsx     # /admin
│       │   │       ├── users.tsx     # /admin/users
│       │   │       ├── roles.tsx     # /admin/roles
│       │   │       ├── logs.tsx      # /admin/logs
│       │   │       ├── settings.tsx  # /admin/settings
│       │   │       └── database.tsx  # /admin/database
│       │   ├── components/
│       │   │   ├── ui/               # Button, Input, Modal, Badge, Calendar, Sidebar, etc.
│       │   │   ├── tasks/            # TaskCard, TaskSection, NewTaskDialog, EditTaskDialog, SubtasksDialog
│       │   │   ├── notes/            # NoteDetailView, NotesView, FoldersView, dialogs
│       │   │   ├── courses/          # CourseTasks, CourseStudyMaterials
│       │   │   ├── today/            # WeekCalendar
│       │   │   ├── profile/          # UserCard, SettingsCard, ThemeSetting, etc.
│       │   │   └── admin/            # AdminUsersManager, AdminLogsView, AdminRolesManager, etc.
│       │   ├── hooks/
│       │   │   ├── useTodayManager.ts    # Today page logic (connected to API)
│       │   │   ├── useTasksManager.ts    # Tasks page logic (connected to API)
│       │   │   ├── useNotesManager.ts    # Notes/folders logic (connected to API)
│       │   │   ├── useProfileManager.ts  # Profile/settings logic
│       │   │   └── useCustomNavManager.ts # Custom nav logic
│       │   ├── lib/
│       │   │   ├── api.ts            # Fetch wrapper (uses Supabase session token)
│       │   │   ├── auth.tsx          # AuthProvider + useAuth() — Supabase session
│       │   │   ├── courseColors.ts   # Deterministic color palette for course cards (id % 7)
│       │   │   ├── courseColors.test.ts
│       │   │   ├── supabase.ts       # Supabase client instance
│       │   │   ├── i18n.ts           # i18next setup (EN/CS, persisted to localStorage)
│       │   │   └── utils.ts
│       │   └── types/
│       │       └── index.ts          # Shared TypeScript types
│       ├── e2e/
│       ├── playwright.config.ts
│       ├── vite.config.ts
│       └── tailwind.config.js
├── docs/
├── docker-compose.yml
└── package.json
```

---

## Current State

### Backend — ✅ Largely complete

| Route file | Status | Notes |
|---|---|---|
| `db/schema.ts` | ✅ Done | All tables implemented, including subtasks (parentId), groupTypeEnum, userIntegrations |
| `db/seed.ts` | ✅ Done | Seeds roles, permissions, email templates |
| `middleware/auth.ts` | ✅ Done | Supabase JWKS verification |
| `services/audit.ts` | ✅ Done | logAction() helper |
| `routes/auth.ts` | ✅ Done | /auth/sync + /auth/logout (Supabase handles register/login/verify) |
| `routes/tasks.ts` | ✅ Done | Full CRUD + subtasks (parentId) + eval |
| `routes/events.ts` | ✅ Done | Full CRUD |
| `routes/notes.ts` | ✅ Done | Full CRUD |
| `routes/folders.ts` | ✅ Done | Full CRUD |
| `routes/users.ts` | ✅ Done | /users/me profile + settings + password |
| `routes/groups.ts` | ✅ Done | Groups + members + assignments |
| `routes/courses.ts` | ✅ Done | Courses + enrollment |
| Admin routes | ❌ Missing | No `/admin` backend routes yet — not in demo scope |
| AI routes | ❌ Missing | `/ai/*` to be implemented (Track 2 — E-infra LLM) |
| Study materials API | ❌ Missing | Not in demo scope |
| Notifications | ❌ Missing | Not in demo scope |

### Frontend — Presentation sprint state (2026-06-06)

| Page / Area | Status | Notes |
|---|---|---|
| Auth (login/register/verify) | ✅ Done | Supabase Auth |
| AuthGuard | ✅ Done | Implemented in `__root.tsx` — redirect to `/login` if `!isAuthenticated` |
| Today screen | ✅ Done | Connected to API (tasks by date, week strip) |
| Tasks | ✅ Done | Connected to API (CRUD, subtasks, toggle) |
| Notes + Folders | ✅ Done | Connected to API |
| Timeline | ✅ Done | Connected to API via `useTimelineManager` |
| Courses list | ✅ Done | Connected to API, colored cards (id % 7 palette), progress bar |
| Course detail | ⚠️ Partial | Connected to API, needs visual polish |
| Profile + Settings | ✅ Done | Theme, language, user info |
| Admin panel | ⚠️ UI only | Uses mock data — not in demo scope |
| Teachers portal | ⚠️ UI shell | Not in demo scope |
| Dark mode | ✅ Done | Tailwind `class` strategy, toggled via settings |
| i18n (EN/CS) | ✅ Done | react-i18next, language saved to localStorage |
| Visual polish (Today/Tasks/Notes/Timeline) | ✅ Done | Greeting + progress bar, urgency badges, countdown, word count, skeleton loaders |
| AI Copilot panel | ❌ Pending | Track 4 — right sidebar, Brief + Chat tabs |
| Notes Quiz modal | ❌ Pending | Track 4 — `QuizModal.tsx`, calls `/ai/notes/:id/quiz` |
| Notes AI chat | ❌ Pending | Track 4 — `NoteAIChat.tsx`, calls `/ai/notes/:id/chat` |

---

## Information Architecture (from brainstorm)

### Student navigation
- 🏠 **Today** — AI-curated daily view, week strip, tasks for today, upcoming deadlines
- ✅ **Tasks** — personal tasks + subtasks + teacher-assigned tasks
- 📚 **Courses** — enrolled courses, progress per course, study materials, course tasks
- 📝 **Notes** — personal notes, folders, link notes to courses
- 📅 **Timeline** — events, deadlines from courses
- 🤖 **AI Copilot** — persistent right panel: proactive feed, chat mode, weekly plan generator
- 👤 **Profile/Settings** — avatar, theme, notifications, language

### Teacher navigation (role toggle in sidebar)
- 🏫 **My Classes** — courses you teach, class roster, pending evaluations count
- 📋 **Assignments** — create & manage assignments, assign to course, track submissions
- 📊 **Evaluations** — grade submitted work, score + feedback
- 📦 **Study Materials** — upload/link materials to courses, organized by topic
- 👥 **Students** — enroll/remove per course, view per-student task status
- 🤖 **AI Insights** — class performance, students at risk, AI-drafted assignment descriptions

**Key principle:** Role toggle pill in the sidebar header — "STUDENT ⇄ TEACHER" — only visible if the user has both roles. No separate login.

### App shell layout
**Desktop:** Sidebar (left) + main content + collapsible AI panel (right)  
**Mobile:** Bottom nav (5 slots) + AI tab  
**Role toggle:** Small pill in sidebar header, switches entire nav set without logout

---

## Presentation Sprint — Remaining Work (2026-06-06)

Demo flow: **Login → Today → Tasks → Notes → Timeline → Courses**

### Track 2 — AI Backend ✅ Done
- `openai` package installed, E-infra client configured (`qwen3.5` model)
- `apps/backend/src/routes/ai.ts` registered at `/ai`
- `POST /ai/brief`, `POST /ai/chat`, `POST /ai/notes/:id/quiz`, `POST /ai/notes/:id/chat` — all implemented
- Rate limit: 10 req/min per user (in-memory Map)

E-infra client setup (add to backend `.env`):
```
E_INFRA_API_TOKEN=<token>
EINFRA_BASE_URL=https://llm.ai.e-infra.cz/v1/
EINFRA_MODEL=llama3.3:latest
```

### Track 3 — Visual Polish ✅ Done
- `/today` — greeting by time of day + daily progress bar + skeleton loader
- `/tasks` — urgency badges (red/yellow/green), countdown text, strikethrough + opacity animation, skeleton loader
- `/notes` — word count + reading time, `🧠 Quiz me` + `✦ Ask AI` buttons in toolbar
- `/timeline` — skeleton loader (loading state)

### Track 4 — AI Frontend
12. `AIPanelContext.tsx` — isOpen state + toggle
13. `AICopilotPanel.tsx` — 280px right sidebar, tabs: Brief / Chat
14. `BriefTab.tsx` — calls `POST /ai/brief`, shimmer skeleton, refresh button
15. `ChatTab.tsx` — local message history, Enter to send, auto-scroll
16. `QuizModal.tsx` — `🧠 Quiz me` modal, 5 questions, colored correct/incorrect answers
17. `NoteAIChat.tsx` — `✦ Ask AI` drawer for note context chat

### Shared — Demo Seed Data
18. Extend `seed-user.ts`: 3 courses, 10 tasks (mix of urgency), 5 events, 4 notes (200+ words each)
19. Demo account: `demo@student.muni.cz` (set password in Supabase Admin)

### Not in scope (YAGNI)
- Teacher portal, admin panel API, AI streaming, persistent chat history, notifications, Pomodoro

---

## Backlog — Next features to implement

### iCal export
- `GET /events/ical` — returns iCal format (RFC 5545) of all user events + task deadlines
- Frontend: "Add to Calendar" button on Timeline page → links to the endpoint
- No auth token needed in URL (use signed URL or query param token)

### Evaluation visibility for students
- Student marks task DONE → teacher evaluates (score + feedback via POST /tasks/:id/eval)
- Currently student can GET /tasks/:id/eval but there is no UI showing it
- Add eval display on task detail / task card: score badge + feedback text
- Teacher side: in course assignments view, list DONE tasks with "Evaluate" button

### PDF reading for AI agent
- Study materials often have PDF URLs; agent cannot read them
- Add `read_material_content` tool: fetches PDF URL → extracts text → returns to model
- Use `pdf-parse` npm package (works in Bun) for text extraction
- Agent can then summarize, quiz, or answer questions about the PDF content

---

## Auth Architecture (IMPORTANT — differs from original spec)

**Auth is handled by Supabase**, not custom JWT. This changes several patterns:

### How auth works
1. **Register/Login/Verify** → handled entirely by Supabase Auth on the frontend (`supabase.auth.signUp`, `supabase.auth.signInWithPassword`)
2. **Session token** → Supabase issues a JWT; frontend stores it via Supabase SDK
3. **Backend verification** → `middleware/auth.ts` verifies the Supabase JWT using JWKS (`jose` library)
4. **User sync** → after first login, frontend calls `POST /auth/sync` to create a local `users` record linked by `auth_id`

### Backend auth middleware pattern
```typescript
// middleware/auth.ts — actual implementation
import { jwtVerify, createRemoteJWKSet } from 'jose';
const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .derive(async ({ headers }) => {
    const token = headers.authorization?.replace('Bearer ', '');
    if (!token) return { user: null as AuthUser | null };
    return { user: await resolveUser(token) };
  })
  .as('global');
```

### Protecting routes — always add this onBeforeHandle
```typescript
.onBeforeHandle(({ user, set }) => {
  if (!user) {
    set.status = 401;
    return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
  }
})
```

### Frontend auth context
```typescript
// lib/auth.tsx — actual implementation
// Uses Supabase session, NOT localStorage token
// Provides: { session, user, isAuthenticated, isLoading, signOut }
```

---

## Backend Conventions

### Validation — use Zod, NOT Elysia t.Object
```typescript
import { z } from 'zod';
import { zodBody } from '../lib/validation';

const CreateSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string(),
  description: z.string().optional(),
});

// In route handler:
.post('/', async ({ body, user }) => { ... }, zodBody(CreateSchema))
```

### Route file structure (ElysiaJS)
```typescript
export const tasksRoutes = new Elysia({ prefix: '/tasks' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) { set.status = 401; return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' }; }
  })
  .get('/', async ({ user }) => {
    const authUser = user as AuthUser;
    return db.select().from(tasks).where(and(eq(tasks.userId, authUser.id), isNull(tasks.deletedAt)));
  })
  // ...
```

### Audit logging
```typescript
import { logAction } from '../services/audit';

// Call on every INSERT, UPDATE, soft-DELETE:
await logAction(db, authUser.id, `Created task ${task.id}: ${task.title}`);
```

### Soft delete — always
```typescript
await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, id));
// Every SELECT must include: isNull(table.deletedAt)
```

### Ownership check pattern
```typescript
const [item] = await db
  .select()
  .from(tasks)
  .where(and(eq(tasks.id, id), eq(tasks.userId, authUser.id), isNull(tasks.deletedAt)));
if (!item) { set.status = 404; return { error: 'NOT_FOUND', message: 'Not found or access denied' }; }
```

---

## Frontend Conventions

### API client
```typescript
// lib/api.ts — uses Supabase session token, NOT localStorage
// The token comes from supabase.auth.getSession()
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
```

### i18n usage
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
// Usage: t('nav.today'), t('tasks.loading'), etc.
// Add new keys to both src/locales/en.json and src/locales/cs.json
```

### TanStack Router — file-based routing
- Files in `src/routes/` become routes automatically
- `__root.tsx` = root layout
- `$paramName.tsx` = dynamic segment
- After adding any route file, run the dev server — TanStack Router auto-generates `routeTree.gen.ts`
- **Do NOT manually edit `routeTree.gen.ts`**

### Dark mode
```typescript
// Already configured: darkMode: 'class' in tailwind.config.js
// Toggle: document.documentElement.classList.toggle('dark', !lightTheme)
// Use: className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
```

---

## Database Schema (Actual — as implemented)

### Enums
```typescript
export const roleNameEnum = pgEnum('role_name', ['USER', 'MENTOR', 'ADMIN', 'TEACHER']);
export const taskStatusEnum = pgEnum('task_status', ['TODO', 'IN PROGRESS', 'DONE']);
export const groupTypeEnum = pgEnum('group_type', ['SEMINAR', 'GROUP']);
```

### Tables implemented
- `users` — with `auth_id` (Supabase UUID) field
- `user_profiles`, `user_settings`
- `roles`, `user_roles`, `permissions`, `role_permissions`
- `groups` (with `group_type` enum), `group_members`
- `assignments`
- `courses`, `user_courses`
- `tasks` — with `parent_id` (self-reference for subtasks)
- `evals`
- `events`
- `folders`, `notes`
- `email_templates`, `emails`
- `audit_logs`
- `user_integrations`

### Tasks — subtask support
```typescript
// tasks table has:
parentId: integer('parent_id').references((): AnyPgColumn => tasks.id)
// Parent tasks have parentId = null
// Subtasks have parentId = <parent task id>
// GET /tasks returns only top-level tasks; subtasks fetched separately or nested
```

---

## API Endpoint Reference

### Auth (`/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/sync` | No | Sync Supabase user to local DB (call after first login) |
| POST | `/auth/logout` | Yes | Set active_session = false |

> Register/login/verify-email are handled by Supabase Auth on the frontend — no backend endpoints needed.

### Tasks (`/tasks`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tasks` | Yes | List own top-level tasks (parentId IS NULL) |
| POST | `/tasks` | Yes | Create task. Body: `{ title, dueDate, description?, assignmentId?, parentId? }` |
| GET | `/tasks/:id` | Yes | Task detail + subtasks + eval if exists |
| PATCH | `/tasks/:id` | Yes | Update. Body: `{ title?, description?, dueDate?, status?, parentId? }` |
| DELETE | `/tasks/:id` | Yes | Soft delete |
| PATCH | `/tasks/:id/toggle-done` | Yes | Toggle DONE ↔ TODO |
| POST | `/tasks/:id/eval` | MENTOR | Body: `{ score, feedback }` |
| GET | `/tasks/:id/eval` | Yes | Get eval |

### Events (`/events`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/events` | Yes | List own events |
| POST | `/events` | Yes | Body: `{ title, startDate, endDate, description?, place? }` |
| GET | `/events/:id` | Yes | Event detail |
| PATCH | `/events/:id` | Yes | Update |
| DELETE | `/events/:id` | Yes | Soft delete |

### Notes (`/notes`) + Folders (`/folders`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notes` | Yes | List own notes |
| POST | `/notes` | Yes | Body: `{ title, description, folderId? }` |
| GET | `/notes/:id` | Yes | Note detail |
| PATCH | `/notes/:id` | Yes | Update |
| DELETE | `/notes/:id` | Yes | Soft delete |
| GET | `/folders` | Yes | List own folders |
| POST | `/folders` | Yes | Body: `{ name }` |
| DELETE | `/folders/:id` | Yes | Soft delete (nullifies notes.folderId first) |

### Users (`/users`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Yes | Own profile + settings |
| PATCH | `/users/me/profile` | Yes | Body: `{ name?, title?, avatar?, organization?, bio? }` |
| PATCH | `/users/me/password` | Yes | Body: `{ currentPassword, newPassword }` |
| GET | `/users/me/settings` | Yes | Get UserSettings |
| PATCH | `/users/me/settings` | Yes | Body: `{ notificationsEnabled?, lightTheme? }` |
| GET | `/users/search` | MENTOR | Query: `?q=string` |

### Groups (`/groups`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/groups` | Yes | Groups where user is mentor or member |
| POST | `/groups` | MENTOR | Body: `{ name, memberIds?: number[] }` |
| GET | `/groups/:id` | Yes | Group detail + members |
| DELETE | `/groups/:id` | MENTOR | Soft delete |
| POST | `/groups/:id/members` | MENTOR | Body: `{ userIds: number[] }` |
| DELETE | `/groups/:id/members/:userId` | MENTOR | Remove member |
| GET | `/groups/:id/assignments` | Yes | List assignments |
| POST | `/groups/:id/assignments` | MENTOR | Body: `{ title, dueDate, description? }` |

### Courses (`/courses`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/courses` | Yes | Courses user is enrolled in |
| POST | `/courses` | TEACHER | Create course |
| GET | `/courses/:id` | Yes | Course detail + enrolled count |
| PATCH | `/courses/:id` | TEACHER | Update course |
| DELETE | `/courses/:id` | TEACHER | Soft delete |
| POST | `/courses/:id/enroll` | Yes | Enroll current user |
| DELETE | `/courses/:id/enroll` | Yes | Unenroll current user |
| GET | `/courses/:id/progress` | Yes | Task completion stats |

### AI (`/ai`) — Track 2, to be implemented
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/ai/brief` | Yes | Daily brief + top 3 priorities from user's tasks/events |
| POST | `/ai/chat` | Yes | General chat with user context (tasks, courses). Body: `{ messages: [{role, content}] }` |
| POST | `/ai/notes/:id/quiz` | Yes | Generate 5 MCQ from note content. Returns `{ questions: [{question, options, correct}] }` |
| POST | `/ai/notes/:id/chat` | Yes | Chat grounded in specific note. Body: `{ messages: [{role, content}] }` |

### Not in scope
- `/admin/*` — not in demo flow
- `/study-materials/*` — not in demo scope

---

## Key Business Rules

1. **Soft delete everywhere** — `deleted_at IS NULL` in all SELECTs, never hard DELETE
2. **Audit every mutation** — every INSERT/UPDATE/soft-DELETE → `logAction(db, actorId, description)`
3. **Ownership validation** — user can only modify their own tasks/events/notes
4. **Subtasks** — tasks can have `parentId`; GET /tasks returns only top-level (parentId IS NULL)
5. **Task status toggle** — DONE → TODO, TODO/IN PROGRESS → DONE
6. **Assignment creates N tasks** — one task per group member, all linked to same `assignment_id`
7. **Auth via Supabase** — never store passwords manually; `pwd_hash` column kept for schema completeness but is empty string
8. **Dark mode** — persisted in `user_settings.light_theme`, applied via `dark` class on `<html>`
9. **i18n** — all user-facing strings must use `t()` from react-i18next; add keys to both `en.json` and `cs.json`
10. **Role toggle** — users with TEACHER role see teacher nav; sidebar shows "STUDENT ⇄ TEACHER" pill

---

## What NOT to Do

- **Do NOT hard-delete any rows** — always soft-delete with `deleted_at`
- **Do NOT skip audit logging** on any data mutation
- **Do NOT edit `routeTree.gen.ts`** — auto-generated
- **Do NOT edit files in `drizzle/`** — generated migration SQL
- **Do NOT use `any` TypeScript type** unless justified
- **Do NOT add routes without auth protection** (`onBeforeHandle` check for `!user`)
- **Do NOT forget `isNull(table.deletedAt)`** in WHERE clauses
- **Do NOT use Elysia `t.Object()`** for validation — use Zod + `zodBody()` instead
- **Do NOT use `localStorage` for the auth token** — use Supabase session
- **Do NOT add new i18n strings without adding to both `en.json` and `cs.json`**

---

## Development Commands

```bash
# Root:
pnpm install

# Frontend (from repo root):
pnpm --filter @pb138/frontend dev    # http://localhost:5173
pnpm --filter @pb138/frontend test
pnpm --filter @pb138/frontend test:e2e

# Backend (from apps/backend/):
bun run dev                          # http://localhost:3001
bun test

# DB (from apps/backend/) — DB is Supabase cloud, no local Docker needed:
bun run db:generate    # Generate migrations from schema changes
bun run db:migrate     # Apply migrations
bun run db:push        # Push schema directly (dev only)
bun run src/db/seed.ts # Run seed
bun run src/db/seed-user.ts # Seed demo user data

# Lint + format:
pnpm lint
pnpm format
```

---

## Code Style

- **Prettier:** `singleQuote: true`, `semi: true`, `tabWidth: 2`, `trailingComma: 'es5'`, `printWidth: 100`
- **TypeScript:** strict mode, no `any`
- **Imports:** 1) node_modules, 2) internal `@pb138/`, 3) relative. Sorted alphabetically.
- **Commit format:** `feat:`, `fix:`, `change:`, `docs:`
- **No comments** unless the WHY is non-obvious
