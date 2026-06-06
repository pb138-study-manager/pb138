# Video skript — Student OS demo

**Predmet:** PB138 | **Projekt:** Study Manager (Student OS)  
**Autori:** Peter Perveka (564577), Valéria Kvaššayová (550435)  
**Odhadovaná dĺžka:** ~4–5 minút

---

## 1. Vývojové prostredie (0:00–1:00)

Otvor VS Code s projektom. V súborovom strome rozklikni `apps/` — vysvetli:

> "Projekt je rozdelený na dve časti — backend a frontend. Backend beží na Bune s frameworkom ElysiaJS, frontend je React s Vite."

### Backend — `apps/backend/src/`

Rozklikni postupne a povedz ku každému:

- **`index.ts`** — "Hlavný vstupný bod servera, tu sa registrujú všetky routes."
- **`db/`** — "Tu je celá databázová vrstva. `schema.ts` definuje všetky tabuľky cez Drizzle ORM, `seed.ts` naplní základné dáta ako role a permissions."
- **`routes/`** — "Každý doménový celok má vlastný súbor — tasky, notes, kurzy, skupiny, používatelia. Každá route je chránená auth middlewarom."
- **`middleware/auth.ts`** — "Middleware overuje Supabase JWT token pri každom requeste cez JWKS endpoint."
- **`services/audit.ts`** — "Každá mutácia — create, update, delete — sa loguje do audit logu cez túto service."

### Frontend — `apps/frontend/src/`

- **`routes/`** — "File-based routing cez TanStack Router. Každý súbor je stránka — `today/index.tsx`, `tasks/index.tsx` a podobne."
- **`components/`** — "UI komponenty rozdelené podľa domény — tasks, notes, courses, admin. Každá doména má vlastný priečinok."
- **`hooks/`** — "Logika každej stránky je oddelená do custom hookov — `useTasksManager`, `useNotesManager`, `useAdminManager` a ďalšie."
- **`locales/`** — "Aplikácia podporuje dva jazyky — angličtinu a češtinu. Všetky texty sú tu v JSON súboroch."

### Spustenie

Otvor terminál, spusti backend:

```bash
cd apps/backend && bun run dev
```

Otvor druhý terminál, spusti frontend:

```bash
pnpm --filter @pb138/frontend dev
```

> "Backend beží na porte 3001, frontend na 3000."

---

## 2. Registrácia a prihlásenie

Otvor browser na `http://localhost:3000` — app presmeruje na `/login`.

Prejdi na `/register`:

> "Registrácia prebieha cez Supabase Auth — my na backende nespravujeme heslá ani sessions, to všetko rieši Supabase. My iba po prvom prihlásení syncujeme používateľa do našej databázy."

Vyplň meno, email, heslo — odošli. Ukáž email verification obrazovku:

> "Supabase automaticky pošle overovací email. Kým používateľ neklikne na link, nemôže sa prihlásiť."

Prejdi na `/login`, prihlás sa:

> "Po prihlásení frontend zavolá náš endpoint `POST /auth/sync`, ktorý vytvorí lokálny záznam používateľa prepojený cez Supabase UUID."

App presmeruje na `/today`.

---

## 3. USER — Today

> "Toto je hlavná obrazovka pre študenta. Tasky sú rozdelené do troch sekcií."

Ukáž sekcie:

- **Today** — tasky s dnešným deadlinom
- **Backlog** — tasky bez deadlinu alebo s budúcim termínom
- **Done** — dokončené tasky

Klikni `+` pri Today — vytvor nový task, vyplň názov a dátum:

> "Task sa uloží cez `POST /tasks` a okamžite sa objaví v príslušnej sekcii."

Zaklikni task ako hotový:

> "Toggle done zavolá `PATCH /tasks/:id/toggle-done` — task sa presunie do Done sekcie."

---

## 4. USER — Tasks

Prejdi na `/tasks`:

> "Na stránke Tasks je kompletný zoznam všetkých taskov rozdelený do viacerých sekcií."

Ukáž sekcie:

- **Overdue** — po termíne
- **Today** — na dnes
- **This Week** — tento týždeň
- **Later** — ďalej v budúcnosti
- **Done** — hotové

Klikni na task — ukáž subtasky:

> "Každý task môže mať subtasky. Vidíme progress bar ktorý ukazuje koľko subtaskov je hotových."

---

## 5. USER — Notes & Timeline

Prejdi na `/notes`:

> "Poznámky sú organizované do priečinkov. Každý priečinok môže obsahovať ľubovoľný počet poznámok."

Otvor priečinok, otvor poznámku — ukáž editor:

> "Poznámku možno prepojiť s kurzom — takto má študent všetky poznámky k predmetu na jednom mieste."

Prejdi na `/timeline`:

> "Timeline zobrazuje týždenný kalendár. Bodky pod dátumami signalizujú udalosti alebo deadliny."

Klikni `+` — vytvor novú udalosť, vyplň názov a dátum:

> "Udalosť sa uloží cez `POST /events` a zobrazí sa v kalendári."

---

## 6. USER — Courses

Prejdi na `/courses`:

> "Kurzy sú zobrazené ako karty — každá karta ukazuje názov, popis a semester."

Otvor detail kurzu — záložka **Assignments**:

> "V záložke Assignments vidí študent všetky zadania od učiteľa s termínmi a stavom splnenia."

Záložka **Materials**:

> "Materials obsahuje súbory a odkazy ktoré učiteľ pridal ku kurzu."

Záložka **Notes**:

> "Tu sú poznámky ktoré si študent prepojil s týmto kurzom."

---

## 7. TEACHER — Teacher Portal

Prejdi na `/profile` — zapni **Teacher Mode**:

> "Používateľ s rolou Teacher môže prepínať medzi študentským a učiteľským pohľadom. Navigácia sa úplne zmení."

Prejdi na `/teachers` — ukáž My Classes:

> "Teacher vidí iba kurzy ktoré sám vyučuje, s počtom zapísaných študentov."

Otvor kurz — záložka **Assignments** — vytvor nové zadanie:

> "Po vytvorení zadania systém automaticky vygeneruje task pre každého zapísaného študenta v kurze."

Záložka **Students** — ukáž zoznam:

> "Učiteľ vidí všetkých študentov a pre každého koľko zadaní má hotových."

Klikni na zadanie — ukáž eval — zadaj skóre a feedback:

> "Hodnotenie sa uloží a študent ho uvidí pri svojom tasku."

---

## 8. ADMIN — Admin Panel

Prejdi na `/admin`:

> "Admin panel má vlastnú navigáciu — hlavný sidebar sa skryje. Vidíme prehľad štatistík celého systému."

Ukáž čísla — users, log events, roles.

Prejdi na `/admin/logs`:

> "Každá akcia v systéme — vytvorenie tasku, prihlásenie, zmena role — sa loguje. Toto je audit trail."

Prejdi na `/admin/users`:

> "Admin vidí všetkých používateľov, môže vyhľadávať a spravovať ich role."

Prejdi na `/admin/roles`:

> "Tu sú definované role — USER, TEACHER, ADMIN — a ich permissions."

---

## 9. Záver

Vráť sa na `/today`. Prejdi na `/profile` — prepni dark mode:

> "Na záver — aplikácia podporuje tmavý režim a dva jazyky, slovenčinu a angličtinu, všetko uložené v nastaveniach používateľa."

> "Projekt je postavený ako monorepo, backend na Bune s ElysiaJS, frontend na Reacte s Vite, autentifikácia cez Supabase, databáza PostgreSQL s Drizzle ORM."
