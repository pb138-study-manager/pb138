# PB138 — Aktuálny stav projektu

> **Aktualizované:** 2026-05-16 (session 2)  
> **Vetva:** `merge-be-fe`

---

## Čo sa zmenilo oproti pôvodnému plánu

| Oblasť | Pôvodný plán | Skutočnosť |
|---|---|---|
| Auth | Vlastný JWT (`@elysiajs/jwt`) | **Supabase Auth** — register/login/verify rieši Supabase, backend iba syncuje používateľa |
| Validácia | Elysia `t.Object()` | **Zod** + vlastný `zodBody()` helper (`src/lib/validation.ts`) |
| i18n | Neplánované | **react-i18next** — EN + CS lokalizácia, uložená v localStorage |
| Subtasky | Neplánované | **Implementované** — `tasks.parent_id` self-referencia + SubtasksDialog v UI |
| Prepojenie notes↔kurzy | Plánované | **Implementované** — `notes.course_id` FK v schéme |
| Mobile nav | Básic | Bottom nav (5 slotov) + Sidebar — oba v `__root.tsx` |
| Vízia | Task/event manager | **Student OS** — AI copilot + teacher portal (pozri `PRODUCT.md`) |

---

## Backend — stav

### ✅ Hotové

| Súbor | Čo robí |
|---|---|
| `db/schema.ts` | Celá Drizzle schéma — users, profiles, settings, RBAC, tasks (parentId, courseId), events, notes (folderId, courseId), folders, groups (groupType), assignments, courses, evals, email_templates, emails, audit_logs, user_integrations |
| `db/seed.ts` | Seed rolí, permissions, emailových šablón |
| `middleware/auth.ts` | Supabase JWKS verifikácia → `{ user: AuthUser | null }` v každej route |
| `services/audit.ts` | `logAction()` — volaný pri každej mutácii |
| `routes/auth.ts` | `POST /auth/sync` + `POST /auth/logout` |
| `routes/tasks.ts` | Kompletné CRUD + subtasky (parentId) + toggle-done + eval |
| `routes/events.ts` | Kompletné CRUD |
| `routes/notes.ts` | Kompletné CRUD |
| `routes/folders.ts` | Kompletné CRUD |
| `routes/users.ts` | `/users/me` profil + nastavenia + vyhľadávanie |
| `routes/groups.ts` | Groups + members + assignments |
| `routes/courses.ts` | Courses + enrollment + progress + `POST /:id/assignments` (vytvára tasky pre všetkých zapísaných) + teacher name/avatar z `userProfiles` |
| `routes/materials.ts` | `GET/POST/DELETE /courses/:id/materials` — study materials pre kurz |
| `lib/validation.ts` | `zodBody()` helper pre Zod validáciu |

### ❌ Chýba

| Čo | Poznámka |
|---|---|
| `/admin/*` routes | UI existuje, backend routes nie |
| `/ai/*` routes | AI Copilot — Claude/E-infra API integrácia |
| `/notifications` | In-app notifikácie |
| `/search` | Globálne vyhľadávanie |
| Email service | `services/email.ts` — SMTP odosielanie |
| `/users/:id/profile` | Verejný profil iného používateľa (KAN-60) |

---

## Frontend — stav

### ✅ Hotové a napojené na API

| Stránka / komponent | Poznámka |
|---|---|
| Login, Register, Verify-email | Supabase Auth |
| **Today** (`/today`) | Week strip + tasky podľa dátumu — napojené na `/tasks` |
| **Tasks** (`/tasks`) | CRUD, subtasky, toggle done — napojené na `/tasks` |
| **Notes** (`/notes`, `/notes/:id`) | CRUD + priečinky — napojené na `/notes`, `/folders` |
| **Profile** (`/profile`) | Profil, téma, jazyk — napojené na `/users/me` |
| Sidebar + BottomNav | Oba v `__root.tsx`, navigácia funguje |
| Dark mode | Tailwind `class` stratégia, toggle v nastaveniach |
| i18n (EN/CS) | react-i18next, jazyk uložený v localStorage |
| `lib/auth.tsx` | Supabase AuthProvider + `useAuth()` |
| `lib/api.ts` | Fetch wrapper so Supabase tokenom |

### ✅ Hotové a napojené na API (pridané v session 2)

| Stránka / komponent | Poznámka |
|---|---|
| **AuthGuard** (`__root.tsx`) | `useEffect` redirect na `/login` pre neprihlásených; loading spinner; null guard (KAN-25) |
| **Default redirect** (`/` → `/dashboard`) | `index.tsx` — `beforeLoad` throw redirect |
| **Courses list** (`/courses`) | Napojené na `GET /courses/enrolled`; loading + empty state |
| **Course detail** (`/courses/:id`) | Tabs Tasks / Notes / Materials; teacher name + avatar; tasks split na Assigned / Created by me (KAN-48) |
| **Study materials** | Backend: `study_materials` tabuľka + `routes/materials.ts`; Frontend: Materials tab v course detail (KAN-43) |

### ⚠️ UI existuje, ale používa mock dáta

| Stránka | Čo chýba |
|---|---|
| **Timeline** (`/timeline`) | Stránka existuje → treba napojiť na `/events` API |
| **Admin** (`/admin/*`, 6 stránok) | Kompletné UI s mock dátami → nemá backend routes |

### ⚠️ UI shell existuje, ale nefunkčný

| Stránka | Stav |
|---|---|
| Teacher portal (`/teachers/*`) | Shell stránky existujú, obsah nie je implementovaný |
| Others/More drawer (`/others`) | Shell existuje |

### ❌ Chýba úplne

| Čo | Popis |
|---|---|
| **Role toggle** | Sidebar pill STUDENT ⇄ TEACHER (viditeľný iba pre TEACHER rolu) |
| **AI Copilot panel** | Pravý panel — proaktívny feed, chat, weekly plan |
| **Notification bell** | Bell ikona v headeri + dropdown (KAN-41) |
| **Teacher portal** | My Classes, Assignments, Evaluations, Study Materials, Students (funkčné obrazovky) |
| **Public user profiles** | `/profile/:userId` — kliknutie na meno učiteľa v kurze (KAN-60) |
| **Global search** | CMD+K palette |
| **Task/assignment creation UI** | + tlačidlo v Tasks tabe kurzu nemá modal |

---

## Infraštruktúra

| Oblasť | Stav |
|---|---|
| Docker Compose (postgres + backend + frontend) | ✅ funguje |
| Supabase (PostgreSQL + Auth) | ✅ nakonfigurované |
| GitHub Actions CI (lint → test → build → e2e) | ✅ funguje |
| ESLint + Prettier | ✅ funguje |

---

## Technické rozhodnutia ktoré treba vedieť

### Supabase Auth
Register/login/verify neprechádzajú cez náš backend. Volania idú priamo zo Supabase SDK na frontende. Po prvom prihlásení frontend zavolá `POST /auth/sync` → vytvorí lokálny `users` záznam prepojený cez `auth_id`.

### Zod validácia
Všetky backend routes používajú Zod (`z.object()`) cez `zodBody()` helper — **nie** Elysia natívnu `t.Object()`.

### Auth ochrana route
Každá chránená route musí mať:
```typescript
.onBeforeHandle(({ user, set }) => {
  if (!user) { set.status = 401; return { error: 'UNAUTHORIZED' }; }
})
```

### i18n
Všetky user-facing reťazce cez `t()` z `react-i18next`. Pri pridávaní nových — aktualizovať **oba** súbory: `src/locales/en.json` aj `src/locales/cs.json`.
