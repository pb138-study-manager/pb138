# PB138 — Aktuálny stav projektu

> **Aktualizované:** 2026-05-18 (session 3)  
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
| `/ai/*` routes | AI Copilot — Claude/E-infra API integrácia |
| `/ai/*` routes | AI Copilot — Claude/E-infra API integrácia |
| `/notifications` | In-app notifikácie |
| `/search` | Globálne vyhľadávanie |
| Email service | `services/email.ts` — SMTP odosielanie |
| `/users/:id/profile` | Verejný profil iného používateľa |

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

### ✅ Hotové a napojené na API (pridané v session 3)

| Stránka / komponent | Poznámka |
|---|---|
| **Admin panel** (`/admin/*`) | Backend: `routes/admin.ts` — users, audit-logs, roles za ADMIN guard; Frontend: `useAdminManager` hook, všetky 3 stránky napojené na API |
| **Admin layout** | `routes/admin/route.tsx` — `AdminSidebar` + `p-6` padding, hlavný sidebar skrytý na admin stránkach |
| **Timeline** (`/timeline`) | Napojené na `GET /events?from&to` + `GET /tasks`; create/edit/delete event funguje |
| **Role toggle** | `RoleModeSetting` komponent v `/profile` — toggle switch, `roleMode` v localStorage; sidebar + bottom nav reagujú na `mode + isTeacher` |

### ⚠️ UI shell existuje, ale je placeholder

| Stránka | Stav |
|---|---|
| **Teacher portal** (`/teachers/*`) | Shell stránky existujú (My Classes, atď.), obsah nie je implementovaný — zostáva ako placeholder |
| Others/More drawer (`/others`) | Shell existuje |

### ❌ Chýba úplne

| Čo | Popis |
|---|---|
| **AI Copilot panel** | Pravý panel — proaktívny feed, chat, weekly plan |
| **Notification bell** | Bell ikona v headeri + dropdown |
| **Public user profiles** | `/profile/:userId` — kliknutie na meno učiteľa v kurze |
| **Global search** | CMD+K palette |

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
