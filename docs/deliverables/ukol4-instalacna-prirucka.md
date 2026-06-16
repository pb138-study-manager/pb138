# Inštalačná príručka — Student OS

Peter Perveka (564577), Valéria Kvaššayová (550435) — PB138, 2026

---

## Požiadavky

Na spustenie projektu potrebujete:

- **Git** 2.x
- **Node.js** 20 LTS
- **pnpm** 10 (`npm install -g pnpm`)
- **Bun** 1.x — runtime pre backend ([bun.sh](https://bun.sh))
- **PostgreSQL** 16
- **Supabase účet** — stačí bezplatný tier

HW minimum: 4 GB RAM, 1 GB voľného miesta na disku.

---

## Štruktúra projektu

Repozitár je monorepo s dvomi aplikáciami:

```
pb138/
+-- apps/
|   +-- backend/    # ElysiaJS API (Bun) — routes, db, middleware
|   +-- frontend/   # React + Vite — UI, routing, i18n
+-- package.json    # pnpm workspaces
```

Každá aplikácia má vlastný `.env.example` so zoznamom potrebných premenných.

---

## Inštalácia

**1. Klonovanie**

```bash
git clone https://github.com/pb138-study-manager/pb138.git
cd pb138
```

**2. Závislosti**

```bash
pnpm install
```

**3. Supabase projekt**

Vytvorte nový projekt na [supabase.com](https://supabase.com). Z dashboardu potrebujete:

- `Project URL` a `anon key` — v _Project Settings → API_
- `JWT Secret` — v _Project Settings → JWT Settings_
- `service_role key` — tamtiež, skryté pole

V _Authentication → URL Configuration_ nastavte:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/verify-email`

**4. Konfigurácia**

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Vyplňte `apps/backend/.env`:

```env
DATABASE_URL=postgresql://postgres:heslo@localhost:5432/pb138
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://vas-projekt.supabase.co
SUPABASE_JWT_SECRET=vas-jwt-secret
SUPABASE_SERVICE_ROLE_KEY=vas-service-role-key
```

Vyplňte `apps/frontend/.env`:

```env
VITE_SUPABASE_URL=https://vas-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=vas-anon-key
```

**5. Databáza**

```bash
cd apps/backend
bun run db:migrate   # vytvorí tabuľky
bun run src/db/seed.ts   # naplní role a permissions
```

---

## Spustenie

Dva terminály:

```bash
# Terminál 1 — backend
cd apps/backend && bun run dev

# Terminál 2 — frontend
pnpm --filter @pb138/frontend dev
```

App beží na `http://localhost:3000`, API na `http://localhost:3001`.

Pri prvom otvorení kliknite na _Register_, overte email a prihláste sa.

---

## Časté problémy

**Backend sa nespustí** — skontrolujte `.env`, či sú vyplnené všetky Supabase hodnoty.

**Registrácia nefunguje** — skontrolujte Site URL a Redirect URL v Supabase dashboarde.

**`relation does not exist`** — migrácie neboli spustené, zopakujte `bun run db:migrate`.

**Port obsadený** — zmeňte port v `vite.config.ts` (frontend) alebo v `.env` (backend).
