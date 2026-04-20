# PB138 — Study Manager: Detailný implementačný plán

> Vychádza z: ERD, Use Case diagramu, requirements (user/mentor/admin), existujúcej infraštruktúry  
> Stav k: apríl 2026  
> Tím: 4 ľudia

---

## Aktuálny stav (čo je hotové)

| Oblasť | Stav |
|---|---|
| Monorepo (pnpm workspaces) | ✅ hotové |
| Docker Compose (postgres + backend + frontend) | ✅ hotové |
| CI/CD pipeline (GitHub Actions: lint → test → build → e2e) | ✅ hotové |
| Backend: ElysiaJS server + `/health` route | ✅ hotové |
| Backend: Drizzle ORM pripojenie na PostgreSQL | ✅ hotové |
| DB schema: iba tabuľka `users` (placeholder) | ⚠️ neúplné |
| Frontend: React + TanStack Router + Tailwind | ✅ hotové |
| Frontend: iba prázdna homepage | ⚠️ neúplné |
| Playwright E2E setup | ✅ hotové |
| ESLint + Prettier | ✅ hotové |

---

## Fázy implementácie

---

### FÁZA 1 — Databázová schéma (Drizzle ORM)

> Priorita: **KRITICKÁ** — všetko ostatné závisí od tohto  
> Odhadovaný čas: 1–2 dni  
> Kto: 1 osoba (backend)

#### 1.1 Nahradiť placeholder schému kompletnou schémou podľa ERD

Súbor: `apps/backend/src/db/schema.ts`

Tabuľky na implementáciu v tomto poradí (kvôli závislostiam na foreign keys):

**Blok A — Používatelia a RBAC:**
- [ ] `users` — id, email (unique), login (unique), pwd_hash, active_session, deleted_at
- [ ] `user_profiles` — user_id (PK, FK), name, title, avatar, organization, bio
- [ ] `user_settings` — user_id (PK, FK), notifications_enabled (default true), light_theme (default true)
- [ ] `roles` — id, name (enum: 'USER' | 'MENTOR' | 'ADMIN')
- [ ] `user_roles` — user_id (FK), role_id (FK)
- [ ] `permissions` — id, name (napr. 'CREATE_TASK', 'ADD_TO_GROUP', 'VIEW_LOGS')
- [ ] `role_permissions` — role_id (FK), permission_id (FK)

**Blok B — Obsah (Tasks, Events, Notes):**
- [ ] `assignments` — id, group_id (FK), title, description, due_date, deleted_at
- [ ] `tasks` — id, user_id (FK), assignment_id (nullable FK), title, description, due_date, status (enum: 'TODO'|'IN PROGRESS'|'DONE'), deleted_at
- [ ] `evals` — id, task_id (FK), feedback, score, evaluated_at
- [ ] `events` — id, user_id (FK), title, description, start_date, end_date, place, deleted_at
- [ ] `notes` — id, user_id (FK), title, description, deleted_at

**Blok C — Skupiny:**
- [ ] `groups` — id, mentor_id (FK na users), name, deleted_at
- [ ] `group_members` — user_id (FK), group_id (FK)

**Blok D — Notifikácie a logy:**
- [ ] `email_templates` — id, type (unique), subject, body
- [ ] `emails` — id, recipient_id (FK), sent_at, status, deleted_at
- [ ] `audit_logs` — id, actor_id (FK na users), happened_at, description

#### 1.2 Vygenerovať a spustiť migrácie

```bash
pnpm --filter @pb138/backend drizzle-kit generate
pnpm --filter @pb138/backend drizzle-kit migrate
```

#### 1.3 Seed data (voliteľné, ale odporúčané pre vývoj)

- [ ] Seed: 3 roly (USER, MENTOR, ADMIN) + ich permissions
- [ ] Seed: 2–3 testovacích používateľov
- [ ] Seed: EmailTemplate záznamy pre typy notifikácií

---

### FÁZA 2 — Autentifikácia (Auth)

> Priorita: **KRITICKÁ** — bez auth nejde nič iné  
> Odhadovaný čas: 2–3 dni  
> Kto: 1 osoba (backend) + 1 osoba (frontend login UI)

#### 2.1 Backend — Auth endpointy (ElysiaJS)

Súbor: `apps/backend/src/routes/auth.ts`

- [ ] `POST /auth/register`
  - Validácia: login, email, password (required), title/fullname/organization (optional)
  - Zaheshovanie hesla (bcrypt alebo Bun's built-in `Bun.password.hash`)
  - Vytvorenie `User` záznamu + `UserProfile` + `UserSettings` (defaults) + pridelenie role `USER`
  - Odoslanie verifikačného emailu (pozri Fázu 7)
  - Zápis do `AuditLog`
  - Odpoveď: redirect na login

- [ ] `POST /auth/verify-email`
  - Validácia verifikačného kódu (uložiť dočasne do pamäte/Redis/DB)
  - Aktivácia účtu po overení

- [ ] `POST /auth/login`
  - Overenie login/email + hesla
  - Vytvorenie JWT tokenu (alebo session)
  - Nastavenie `active_session = true` v DB
  - Zápis do `AuditLog`
  - Odpoveď: JWT token + user info

- [ ] `POST /auth/logout`
  - Zneplatnenie tokenu / session
  - Nastavenie `active_session = false`
  - Zápis do `AuditLog`

#### 2.2 Backend — Auth middleware

Súbor: `apps/backend/src/middleware/auth.ts`

- [ ] JWT verifikácia na každý chránený endpoint
- [ ] Extrakcia `userId` a `roles` z tokenu
- [ ] Middleware na kontrolu rolí (USER / MENTOR / ADMIN)
- [ ] Helper: `requireRole('MENTOR')`, `requirePermission('VIEW_LOGS')`

#### 2.3 Frontend — Auth stránky

Súbor: `apps/frontend/src/routes/`

- [ ] Landing page (`/`) — tlačidlá "Log in" a "Sign up"
- [ ] Login formulár (`/login`) — polia: login/email, heslo + validácia
- [ ] Register formulár (`/register`) — polia: login, email, heslo + voliteľné polia
- [ ] Email verifikácia stránka (`/verify`)
- [ ] Auth guard — presmerovanie neprihlásených na `/login`
- [ ] Uloženie JWT tokenu (localStorage alebo httpOnly cookie)
- [ ] Auth context / store (React context alebo Zustand)

---

### FÁZA 3 — Správa úloh (Tasks)

> Priorita: **VYSOKÁ** — hlavná funkcia aplikácie  
> Odhadovaný čas: 2–3 dni  
> Kto: 1 osoba backend + 1 osoba frontend (paralelne)

#### 3.1 Backend — Task endpointy

Súbor: `apps/backend/src/routes/tasks.ts`

- [ ] `GET /tasks` — zoznam úloh aktuálneho používateľa (`user_id = me`, `deleted_at IS NULL`)
  - Query parametre: `status`, `due_date_from`, `due_date_to`, `sort_by`, `order`
- [ ] `POST /tasks` — vytvorenie úlohy (title, due_date required; description optional)
- [ ] `GET /tasks/:id` — detail úlohy (vrátane Eval ak existuje)
- [ ] `PATCH /tasks/:id` — update úlohy (validácia ownership)
- [ ] `DELETE /tasks/:id` — soft delete (`deleted_at = now()`)
- [ ] `PATCH /tasks/:id/toggle-done` — prepnutie statusu DONE ↔ TODO
- Všetky operácie → zápis do `AuditLog`

#### 3.2 Frontend — Task UI

- [ ] Dashboard / hlavná stránka (`/dashboard`) — zoznam úloh
  - Karta úlohy: title, due_date, status badge, tlačidlá akcie
- [ ] Filter panel — podľa statusu, rozsahu dátumov, prítomnosti assignment
- [ ] Zoradenie — podľa due_date (default: asc), statusu
- [ ] Modal / stránka: vytvorenie úlohy (`/tasks/new`) — formulár s validáciou
- [ ] Modal / stránka: detail úlohy (`/tasks/:id`) — zobrazenie vrátane Eval
- [ ] Inline editácia alebo edit stránka (`/tasks/:id/edit`)
- [ ] Potvrdzovacie modaly pre delete
- [ ] Tlačidlo "Mark as Done" / prepínač statusu

---

### FÁZA 4 — Správa udalostí (Events)

> Priorita: **VYSOKÁ**  
> Odhadovaný čas: 1–2 dni  
> Kto: 1 osoba (môže byť súbežne s Fázou 3 ak sú 2 ľudia)

#### 4.1 Backend — Event endpointy

Súbor: `apps/backend/src/routes/events.ts`

- [ ] `GET /events` — zoznam eventov (`user_id = me`, `deleted_at IS NULL`)
- [ ] `POST /events` — vytvorenie (title, start_date, end_date required; description, place optional)
  - Validácia: `start_date <= end_date`
- [ ] `GET /events/:id` — detail eventu
- [ ] `PATCH /events/:id` — update eventu
- [ ] `DELETE /events/:id` — soft delete
- Všetky operácie → zápis do `AuditLog`

#### 4.2 Frontend — Event UI

- [ ] Eventy integrované do hlavného dashboardu (spolu s taskami, odlíšené farebne / ikonou)
- [ ] Prepínač "Task" / "Event" pri vytváraní novej položky
- [ ] Event detail modal/stránka: title, description, place, start_time, end_time
- [ ] Edit form pre event (validácia dátumov)
- [ ] Voliteľné: kalendárový pohľad (`/calendar`) zobrazujúci eventy + úlohy podľa dátumu

---

### FÁZA 5 — Správa poznámok (Notes)

> Priorita: **STREDNÁ**  
> Odhadovaný čas: 1 deň  
> Kto: 1 osoba

#### 5.1 Backend — Note endpointy

Súbor: `apps/backend/src/routes/notes.ts`

- [ ] `GET /notes` — zoznam poznámok používateľa
- [ ] `POST /notes` — vytvorenie (title, description required)
- [ ] `GET /notes/:id` — detail
- [ ] `PATCH /notes/:id` — update
- [ ] `DELETE /notes/:id` — soft delete
- Všetky operácie → zápis do `AuditLog`

#### 5.2 Frontend — Notes UI

- [ ] Sekcia/stránka poznámok (`/notes`)
- [ ] Karta poznámky: title, skrátený description
- [ ] Detail / edit modal
- [ ] Vytvorenie novej poznámky

---

### FÁZA 6 — Profil a nastavenia

> Priorita: **STREDNÁ**  
> Odhadovaný čas: 1 deň

#### 6.1 Backend — Profile/Settings endpointy

- [ ] `GET /users/me` — vlastný profil
- [ ] `PATCH /users/me/profile` — update UserProfile (name, title, avatar, organization, bio)
- [ ] `PATCH /users/me/password` — zmena hesla (overenie starého hesla, validácia nového)
  - → `sendNotification` (email o zmene hesla)
- [ ] `GET /users/me/settings` — aktuálne nastavenia
- [ ] `PATCH /users/me/settings` — update UserSettings (notifications_enabled, light_theme)
- Všetky operácie → zápis do `AuditLog`

#### 6.2 Frontend — Profil UI

- [ ] Profilová stránka (`/profile`) — zobrazenie + edit formulár
- [ ] Sekcia zmeny hesla
- [ ] Nastavenia stránka (`/settings`) — prepínač notifikácií, prepínač témy
- [ ] Dark/light mode — aplikovanie Tailwind `dark:` classes, uloženie preferencie

---

### FÁZA 7 — Mentor funkcie

> Priorita: **VYSOKÁ** (je súčasťou use case diagramu ako kľúčová rola)  
> Odhadovaný čas: 3–4 dni  
> Kto: 1 osoba (najskôr po dokončení Fázy 2 + 3)

#### 7.1 Backend — Group endpointy

Súbor: `apps/backend/src/routes/groups.ts`

- [ ] `GET /groups` — skupiny kde je user mentor alebo člen
- [ ] `POST /groups` — vytvorenie skupiny (iba MENTOR)
- [ ] `GET /groups/:id` — detail skupiny + zoznam členov
- [ ] `DELETE /groups/:id` — soft delete skupiny (iba vlastník skupiny)
  - → `sendNotification` členom
- [ ] `POST /groups/:id/members` — pridanie členov (search + add)
  - → `sendNotification` pridaným používateľom
- [ ] `DELETE /groups/:id/members/:userId` — odobratie člena
  - → `sendNotification` odobranému používateľovi
- [ ] `GET /groups/:id/assignments` — zoznam assignmentov skupiny

#### 7.2 Backend — Search users

Súbor: `apps/backend/src/routes/users.ts`

- [ ] `GET /users/search?q=...` — vyhľadávanie používateľov podľa login/email/name (iba MENTOR+)

#### 7.3 Backend — Assignment + Eval endpointy

- [ ] `POST /groups/:id/assignments` — vytvorenie assignment + task pre každého člena skupiny
  - → `sendNotification` každému členovi
- [ ] `GET /groups/:id/assignments/:assignmentId/tasks` — zoznam taskov k assignmentu
- [ ] `POST /tasks/:id/eval` — pridanie hodnotenia (iba MENTOR, task musí byť DONE alebo po due_date)
  - → `sendNotification` autorovi tasku
- [ ] `GET /tasks/:id/eval` — zobrazenie hodnotenia

#### 7.4 Frontend — Mentor UI

- [ ] Sekcia skupín (`/groups`) — zoznam skupín
- [ ] Detail skupiny (`/groups/:id`) — zoznam členov, assignmentov
- [ ] Vytvorenie skupiny — formulár + vyhľadávanie a pridávanie členov
- [ ] Pridanie/odobranie člena
- [ ] Assign task form (prefix createTask s napojením na skupinu)
- [ ] Zobrazenie taskov k assignmentu + stav každého člena
- [ ] Eval form — score + feedback
- [ ] Pre bežného USER: sekcia "My Groups" (`/my-groups`) — read-only prehľad

---

### FÁZA 8 — Admin panel

> Priorita: **STREDNÁ** (požadovaná use case diagramom)  
> Odhadovaný čas: 2–3 dni  
> Kto: 1 osoba

#### 8.1 Backend — Admin endpointy

Súbor: `apps/backend/src/routes/admin.ts`

Všetky endpointy vyžadujú rolu ADMIN:

- [ ] `GET /admin/users` — zoznam všetkých používateľov (paging, filter)
- [ ] `POST /admin/users` — vytvorenie používateľa
- [ ] `PATCH /admin/users/:id` — update používateľa
- [ ] `DELETE /admin/users/:id` — soft delete / deaktivácia
- [ ] `GET /admin/roles` — zoznam rolí + permissions
- [ ] `POST /admin/users/:id/roles` — pridelenie roly používateľovi
- [ ] `DELETE /admin/users/:id/roles/:roleId` — odobratie roly
- [ ] `GET /admin/audit-logs` — zoznam audit logov (filter: user, dátum, akcia)
- [ ] `GET /admin/settings` — globálne nastavenia systému
- [ ] `PATCH /admin/settings` — zmena globálnych nastavení

#### 8.2 Frontend — Admin UI

- [ ] Admin dashboard (`/admin`) — prístupný iba pre ADMIN rolu
- [ ] Správa používateľov — tabuľka, edit, deaktivácia
- [ ] Správa rolí — pridelenie / odobratie roly
- [ ] Audit logy — prehľad s filtrovaním
- [ ] Route guard — presmerovanie non-adminov

---

### FÁZA 9 — Emailové notifikácie a plánovač

> Priorita: **STREDNÁ**  
> Odhadovaný čas: 2 dni  
> Kto: 1 osoba (backend)

#### 9.1 Email service

Súbor: `apps/backend/src/services/email.ts`

- [ ] Konfigurácia SMTP (napr. Nodemailer alebo Bun-compatible alternatíva, pre vývoj: Ethereal/Mailhog)
- [ ] Funkcia `sendEmail(recipientId, templateType, variables)`:
  - Načítanie `EmailTemplate` z DB
  - Interpolácia premenných do šablóny
  - Odoslanie emailu
  - Zápis do `Email` tabuľky (status, sent_at)
  - Zápis do `AuditLog`

#### 9.2 EmailTemplate seed data

- [ ] Template: `REGISTRATION_VERIFY` — verifikácia emailu pri registrácii
- [ ] Template: `PASSWORD_CHANGE` — notifikácia pri zmene hesla
- [ ] Template: `TASK_ASSIGNED` — notifikácia pri pridelení tasku
- [ ] Template: `TASK_EVALUATED` — notifikácia pri hodnotení tasku
- [ ] Template: `GROUP_INVITE` — notifikácia pri pridaní do skupiny
- [ ] Template: `GROUP_REMOVE` — notifikácia pri odobraní zo skupiny
- [ ] Template: `DEADLINE_REMINDER` — pripomienka blížiaceho sa deadline

#### 9.3 Deadline scheduler

Súbor: `apps/backend/src/services/scheduler.ts`

- [ ] Periodická úloha (napr. každú hodinu pomocou `setInterval` alebo `cron`)
- [ ] `checkDeadlines()`:
  - Query Tasks kde `status != DONE` a `due_date` je do 24h (konfigurovateľné)
  - Pre každý nájdený task → `sendEmail(userId, 'DEADLINE_REMINDER', { taskTitle, dueDate })`
  - Rovnako pre Events (`start_date` do 24h)

---

### FÁZA 10 — UI polish a doplnkové pohľady

> Priorita: **STREDNÁ**  
> Odhadovaný čas: 2–3 dni  
> Kto: frontend (paralelne s ostatnými)

#### 10.1 Navigácia a layout

- [ ] Sidebar / navbar — navigácia: Dashboard, Notes, Groups/My Groups, Profile, Settings
- [ ] Podmienená navigácia podľa role (MENTOR vidí Groups, ADMIN vidí Admin)
- [ ] Responsívny dizajn (mobilné zobrazenie)

#### 10.2 Dashboard pohľady

- [ ] **Zoznamový pohľad** — tabuľka/karty úloh a eventov (default)
- [ ] **Kalendárový pohľad** (`/calendar`) — mesačný/týždenný grid, eventy a tasky podľa dátumu
  - Odporúčaná knižnica: `react-big-calendar` alebo vlastný komponent cez Tailwind
- [ ] **Rozvrh pohľad** (`/schedule`) — chronologický zoznam na nadchádzajúce dni

#### 10.3 Filtrovanie a triedenie (detailne)

- [ ] Filter: status (TODO / IN PROGRESS / DONE)
- [ ] Filter: typ (task / event / obe)
- [ ] Filter: rozsah dátumov (date picker)
- [ ] Filter: prítomnosť assignment
- [ ] Zoradenie: due_date asc/desc, status, title
- [ ] Persistencia filtra v URL query parametroch

#### 10.4 UX detaily

- [ ] Toast notifikácie pre úspech/chyby (napr. `react-hot-toast` alebo Tailwind toast)
- [ ] Loading states / skeleton loaders
- [ ] Prázdne stavy (ilustrácia + text keď nemáš žiadne tasky)
- [ ] Konfirmačné dialógy pre destruktívne akcie

---

### FÁZA 11 — Testovanie

> Priorita: **POVINNÁ** (CI pipeline už beží)  
> Odhadovaný čas: 2–3 dni (priebežne počas vývoja)

#### 11.1 Backend unit testy (Bun test)

Súbor: `apps/backend/src/index.test.ts`

- [ ] Test: `GET /health` vracia `{ status: 'ok' }`
- [ ] Test: `POST /auth/register` — vytvorenie účtu, duplicate email/login
- [ ] Test: `POST /auth/login` — správne/nesprávne credentials
- [ ] Test: `POST /tasks` — vytvorenie tasku s validáciou
- [ ] Test: `PATCH /tasks/:id` — update, ownership check
- [ ] Test: `DELETE /tasks/:id` — soft delete, prístupové práva

#### 11.2 Frontend unit/component testy (Vitest + jsdom)

Súbor: `apps/frontend/src/app.test.tsx`

- [ ] Test: renderovanie login formulára
- [ ] Test: validácia formulára (prázdne polia, nesprávny email formát)
- [ ] Test: task karta sa renderuje správne

#### 11.3 E2E testy (Playwright)

Súbor: `apps/frontend/e2e/`

- [ ] Test: registrácia nového používateľa
- [ ] Test: login + zobrazenie dashboardu
- [ ] Test: vytvorenie tasku → zobrazenie v zozname
- [ ] Test: označenie tasku ako done
- [ ] Test: delete tasku
- [ ] Test: vytvorenie eventu
- [ ] Test: prepnutie dark/light mode

---

## Návrh rozdelenia práce (4 ľudia)

> Toto je odporúčanie — upravte podľa silných stránok každého člena.

| Člen | Hlavná zodpovednosť |
|---|---|
| **Peter** | Backend auth (Fáza 2) + DB schéma (Fáza 1) + Tasks backend (Fáza 3.1) |
| **Člen 2** | Frontend UI — Dashboard, Tasks, Events (Fázy 3.2, 4.2, 10) |
| **Valéria** | Mentor funkcie — backend + frontend (Fáza 7) + Notifications (Fáza 9) |
| **Jaroslav** | Events backend (Fáza 4.1) + Notes (Fáza 5) + Admin panel (Fáza 8) + profil (Fáza 6) |

**Dôležité:** Fáza 1 (DB schéma) a Fáza 2 (Auth) musia byť hotové **pred tým**, ako ktokoľvek začína s CRUD operáciami.

---

## Odporúčaný časový harmonogram

```
Týždeň 1: Fáza 1 (DB) + Fáza 2 (Auth backend + frontend)
Týždeň 2: Fáza 3 (Tasks) + Fáza 4 (Events) paralelne
Týždeň 3: Fáza 5 (Notes) + Fáza 6 (Profil) + Fáza 7 (Mentor)
Týždeň 4: Fáza 8 (Admin) + Fáza 9 (Notifications) + Fáza 10 (UI polish)
Týždeň 5: Fáza 11 (Testy) + bug fixes + finalizácia
```

---

## Technické rozhodnutia a poznámky

### JWT vs. sessions
Odporúčam JWT (stateless, vhodné pre SPA + Bun backend). Uloženie v httpOnly cookie je bezpečnejšie ako localStorage (ochrana pred XSS).

### Soft delete pattern
Všetky entity používajú `deleted_at` namiesto fyzického mazania. Každý GET query musí obsahovať `WHERE deleted_at IS NULL`.

### AuditLog
Každá mutácia (INSERT/UPDATE/DELETE) musí zapísať záznam do `audit_logs`. Odporúčam centralizovaný helper:
```typescript
await logAction(db, actorId, 'CREATED_TASK', `Task ${taskId} created`);
```

### Prístupové práva (RBAC)
- MENTOR dedí všetky oprávnenia USER (viz use case diagram: `mentor -|> user`)
- ADMIN má špeciálne systémové oprávnenia nezávisle od bežných user akcií
- Middleware by mal kontrolovať aj ownership (napr. user môže mazať iba vlastné tasky)

### Správa theme (dark/light mode)
Tailwind JIT mode + CSS trieda `dark` na `<html>` elemente. Pri načítaní aplikácie prečítaj `UserSettings.light_theme` a nastav triedu.

### Error handling
Štandardizovaný formát chybových odpovedí:
```json
{ "error": "VALIDATION_FAILED", "message": "...", "fields": { "email": "..." } }
```

---

## Checklist pred odovzdaním

- [ ] Všetky required use cases implementované a funkčné
- [ ] Prihlasovanie / odhlasovanie funguje
- [ ] CRUD pre tasks, events, notes
- [ ] Mentor môže vytvárať skupiny a prideľovať tasky
- [ ] Admin panel prístupný s admin účtom
- [ ] Emailové notifikácie odchádzajú (aspoň pre hlavné eventy)
- [ ] Filter + zoradenie taskov funguje
- [ ] Dark/light mode
- [ ] CI/CD pipeline prechádza (lint + test + build + e2e)
- [ ] Docker Compose spustí celú aplikáciu jedným príkazom
- [ ] README obsahuje inštrukcie na spustenie
- [ ] Všetci 4 členovia tímu majú commity v histórii
