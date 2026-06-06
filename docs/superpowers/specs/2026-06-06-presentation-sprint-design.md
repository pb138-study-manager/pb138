# Presentation Sprint Design — Student OS

**Dátum:** 2026-06-06  
**Cieľ:** Prezentácia-ready produkt s AI wow features  
**Kontekst:** Akademická obhajoba pred pedagógmi, PB138 MU Brno  
**Demo flow:** Login → Today → Tasks → Notes → Timeline → Courses

---

## 1. Prístup — paralelné trackery

4 členovia tímu, každý má nezávislý track. Poradie trackov je odporúčané — Track 1 odblokuje ostatné, zvyšok beží paralelne.

| Track | Zodpovednosť |
|---|---|
| **Track 1 — Fundament** | AuthGuard + Courses → API + bug hunt |
| **Track 2 — AI Backend** | `/ai` endpointy + E-infra LLM integrácia |
| **Track 3 — Visual Polish** | Today / Tasks / Notes / Timeline / Courses vylepšenia |
| **Track 4 — AI Frontend** | AI Copilot panel + Notes AI features (Quiz + Chat) |
| **Spoločne (záver)** | Demo seed data + full run-through + posledný polish |

---

## 2. E-infra LLM API — konfigurácia

**Base URL:** `https://llm.ai.e-infra.cz/v1/`  
**Autentikácia:** Bearer token  
**Kompatibilita:** OpenAI API-compatible (používa sa `openai` npm package)

**Dostupné modely** (overiť aktuálny stav na https://llm.ai.e-infra.cz/status/):

| Model | Použitie |
|---|---|
| `llama3.3:latest` | Rýchly general-purpose chat, brief, quiz |
| `llama3.3:70b-instruct-fp16` | Lepšia kvalita, pomalší |
| `deepseek-r1:32b-qwen-distill-fp16` | Reasoning-heavy úlohy |
| `qwen2.5-coder:32b-instruct-q8_0` | Ak by sme robili code features |
| `gpt-oss-120b` | Najväčší, najlepší, najpomalší |

**Odporúčanie pre demo:** `llama3.3:latest` — dobrá rovnováha rýchlosti a kvality.

**Env vars (`.env` v backend):**
```
E_INFRA_API_TOKEN=<token>
EINFRA_BASE_URL=https://llm.ai.e-infra.cz/v1/
EINFRA_MODEL=llama3.3:latest
```

Model je konfigurovateľný cez env var — dá sa zmeniť bez zmeny kódu.

**Získanie zoznamu modelov (curl):**
```bash
curl -H "Authorization: Bearer ${E_INFRA_API_TOKEN}" \
  https://llm.ai.e-infra.cz/v1/models | jq .data[].id
```

---

## 3. Track 1 — Fundament

### T1-1: AuthGuard komponent

Wrapper komponent ktorý chráni všetky autentikované routes.

**Súbor:** `apps/frontend/src/components/AuthGuard.tsx`

```tsx
// Použiť useAuth() z lib/auth.tsx (Supabase session)
// Ak isLoading === true → zobraziť full-page spinner, nie redirect
// Ak !isAuthenticated → navigate('/login')
// Chránené routes: /today, /tasks, /notes, /notes/:id,
//                  /timeline, /courses, /courses/:id, /profile
```

Aplikovať v `__root.tsx` — jeden wrapper pre všetky chránené routes naraz.

---

### T1-2: Hook `useCourseManager`

Vymeniť `course-mock-data.ts` za reálne API volania.

**Nový súbor:** `apps/frontend/src/hooks/useCourseManager.ts`

Vzor podľa existujúceho `useTasksManager.ts`:

```typescript
// GET /courses               → zoznam kurzov
// GET /courses/:id           → detail kurzu
// GET /courses/:id/progress  → { completed: number, total: number }
// POST /courses/:id/enroll   → zapísať sa
// DELETE /courses/:id/enroll → odhlásiť sa
```

- `courses/index.tsx` — nahradiť mock za `useCourseManager`
- `courses/$courseId.tsx` — nahradiť mock za `useCourseManager`
- Odstrániť `components/courses/course-mock-data.ts` a všetky jeho importy

---

### T1-3: Bug hunt — prejsť celý demo flow

Manuálne otestovať a opraviť kritické bugy pred ostatnými trackami:

1. Login → `/auth/sync` → `/today` sa načíta
2. Vytvoriť task → zobraziť v zozname → toggle done → soft delete
3. Vytvoriť poznámku → upraviť obsah → zaradiť do folderu
4. Timeline → zobraziť eventy → pridať nový event
5. Courses → po napojení na API: zoznam → detail kurzu

Každý bug: priama oprava ak triviálny, inak GitHub issue s popisom krokov na reprodukciu.

---

## 4. Track 2 — AI Backend

### T2-1: Nový route súbor `apps/backend/src/routes/ai.ts`

Registrovať v `index.ts` ako prefix `/ai`.

**OpenAI client setup:**
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.EINFRA_API_KEY,
  baseURL: process.env.EINFRA_BASE_URL,
});
const MODEL = process.env.EINFRA_MODEL ?? 'llama3.3:latest';
```

Všetky endpointy:
- `authMiddleware` + `onBeforeHandle` ownership check
- Zod validácia body pomocou `zodBody()`
- `logAction()` na každé volanie
- Rate limit: jednoduchý in-memory Map — max 10 req/min na `userId`

---

### T2-2: `POST /ai/brief`

```typescript
// Načíta tasks (dueDate <= +7 dní, isNull deletedAt) a events (tento týždeň) pre usera
// Pošle ako kontext do LLM
// Vráti: { brief: string, priorities: { title: string, dueDate: string, urgency: 'high'|'medium'|'low' }[] }
```

**System prompt:**
```
Si študentský asistent. Dostaneš JSON so zoznamom úloh a eventov študenta.
Vygeneruj krátky denný brief (2-3 vety, slovenčina) a identifikuj top 3 priority.
Pre každú prioritu urč urgency: high = deadline do 1 dňa, medium = do 3 dní, low = neskôr.
Odpoveď vráť ako JSON: { "brief": "...", "priorities": [{ "title", "dueDate", "urgency" }] }
```

---

### T2-3: `POST /ai/chat`

```typescript
// Body: { messages: { role: 'user' | 'assistant', content: string }[] }
// Injektovať kontext usera (tasks, courses) do system promptu
// Vráti: { reply: string }
```

**System prompt:**
```
Si študentský AI asistent. Poznáš kontext: {tasksJson}, {coursesJson}.
Odpovedaj v jazyku, v ktorom sa ťa pýtajú (SK/EN). Buď stručný a konkrétny.
```

---

### T2-4: `POST /ai/notes/:id/quiz`

```typescript
// Overiť ownership poznámky (eq userId)
// Načítať obsah (description field)
// Vráti: { questions: { question: string, options: string[], correct: number }[] }
// correct = index do options (0–3)
```

**System prompt:**
```
Si skúšajúci učiteľ. Dostaneš text poznámky. Vytvor presne 5 multiple-choice otázok.
Každá otázka má 4 možnosti (pole strings). Správna odpoveď je na indexe `correct` (0-3).
Odpoveď VÝLUČNE ako JSON bez textu navyše:
{ "questions": [{ "question": "...", "options": ["A","B","C","D"], "correct": 0 }] }
Otázky musia byť v jazyku poznámky.
```

---

### T2-5: `POST /ai/notes/:id/chat`

```typescript
// Body: { messages: { role: 'user' | 'assistant', content: string }[] }
// Overiť ownership poznámky
// Obsah poznámky injektovaný do system promptu
// Vráti: { reply: string }
```

**System prompt:**
```
Si asistent pre štúdium. Odpovedaj IBA na základe nasledujúcej poznámky.
Ak odpoveď v poznámke nie je, úprimne to povedz.
Jazyk odpovede = jazyk otázky.

POZNÁMKA:
{noteContent}
```

---

## 5. Track 3 — Visual Polish

### T3-1: /today

- Greeting header podľa hodiny: `"Dobré ráno, {name} 👋"` (5–11h) / `"Dobrý deň"` (11–18h) / `"Dobrý večer"` (18–5h)
- Progress bar: `"X z Y úloh hotových dnes"` — počítané z dnešných taskov
- Empty state s CTA tlačidlom ak nie sú žiadne dnešné úlohy
- CSS transition na checkmark ikone pri toggle done (nie externá library)

### T3-2: /tasks

- Urgency badge na task karte: červená = dueDate do 24h, žltá = do 72h, zelená = neskôr
- Countdown text vedľa dátumu: `"dnes"`, `"za 2 dni"`, `"oneskorené"` (ak dueDate v minulosti)
- Skupinové sekcie zoznamu: **Dnes** / **Tento týždeň** / **Neskôr** (groupBy dueDate bucket)
- Strikethrough + opacity fade animácia pri označení done (CSS transition)

### T3-3: /notes

- Word count + odhadovaný čas čítania v toolbar poznámky: `"142 slov · ~1 min čítania"`
- Farebné folder ikony — 7 predvolených farieb, user vyberie pri vytvorení folderu
- Tlačidlá **🧠 Quiz me** a **✦ Ask AI** v toolbar (implementácia: Track 4)

### T3-4: /timeline

- Farebné kategórie eventov: kurz = modrá, osobné = zelená, deadline = červená — podľa `type` poľa eventu alebo manuálne nastaviteľné
- Hover tooltip na evente: názov, čas, miesto
- Tlačidlo **+ Pridať event** prominentné v headerri, nie skryté

### T3-5: /courses

- Progress bar per kurz karta: volá `GET /courses/:id/progress`, zobrazí `X / Y úloh`
- Farebné kurz karty: deterministická farba z predvolenej palety podľa `id % 7`
- Enroll / Unenroll tlačidlo funkčné (napojené na API v T1-2)

### T3-6: Globálne

- Loading skeletons na všetkých stránkach (shimmer `animate-pulse` v Tailwind) — nikdy prázdna biela plocha
- Konzistentné error stavy: ak fetch zlyhá, zobraziť error banner, nie `undefined` alebo crash

---

## 6. Track 4 — AI Frontend

### T4-1: AI Copilot Panel

**Nové súbory:**
```
src/context/AIPanelContext.tsx          — isOpen state, toggle funkcia
src/components/ai/AICopilotPanel.tsx   — hlavný sidebar komponent
src/components/ai/BriefTab.tsx         — Daily brief tab
src/components/ai/ChatTab.tsx          — Chat tab
```

**Layout:**
- Šírka 280px, fixná, pravá strana obrazovky
- Toggle tlačidlo `✦` v pravom hornom rohu top baru — vždy viditeľné
- Panel sa nezobrazuje na `/login`, `/register`, `/verify-email`
- Na mobile: panel sa zobrazí ako full-width drawer zdola

**Brief tab:**
- Načíta sa lazy pri prvom otvorení panelu — volá `POST /ai/brief`
- Zobrazí: AI text (2-3 vety) + top 3 priority s farebnými dot indikátormi (červená/žltá/zelená podľa `urgency`)
- Tlačidlo `↻ Aktualizovať` — znova zavolá endpoint a prepíše obsah
- Loading state: shimmer skeleton (nie spinner)

**Chat tab:**
- `messages` pole v lokálnom state — session only, neperzistuje
- Volá `POST /ai/chat` s celou históriou
- Streaming nie je potrebný — čakáme na celú odpoveď
- Enter = odoslať, Shift+Enter = nový riadok v správe
- Auto-scroll na poslednú správu

---

### T4-2: Quiz modal (`QuizModal.tsx`)

**Súbor:** `src/components/notes/QuizModal.tsx`

- Otvára sa tlačidlom `🧠 Quiz me` v note detail toolbar
- Pri otvorení zavolá `POST /ai/notes/:id/quiz`
- Loading state: text `"Generujem otázky…"` so spinnerom
- Otázky jedna po druhej:
  - Header: `"Otázka 2 z 5"`
  - Text otázky
  - 4 klikateľné možnosti (A/B/C/D)
  - Po výbere: zelená = správna, červená = nesprávna + zvýraznenie správnej
  - Tlačidlá `← Predošlá` / `Ďalšia →` / `Dokončiť`
- Záverečná obrazovka: `"4/5 správnych 🎉"` + tlačidlo `Skúsiť znova`

---

### T4-3: Note AI chat (`NoteAIChat.tsx`)

**Súbor:** `src/components/notes/NoteAIChat.tsx`

- Otvára sa tlačidlom `✦ Ask AI` v note detail toolbar
- Zobrazí sa ako drawer z pravej strany (konzistentné s Copilot panelom)
- Indikátor kontextu: zelená bodka + `"Kontext: {názov poznámky}"`
- Volá `POST /ai/notes/:id/chat`
- Rovnaký chat UI štýl ako ChatTab v Copilot paneli
- História len pre session

---

## 7. Demo seed data

Rozšíriť `apps/backend/src/db/seed-user.ts`:

```
Kurzy (3):
  - "PB138 Web Development" — modrá
  - "IB101 Algoritmy" — fialová  
  - "MA001 Matematika" — zelená

Úlohy (10): mix statusov TODO/IN PROGRESS/DONE
  - niektoré dueDate = dnes (pre demo urgentnosti)
  - niektoré = tento týždeň
  - niektoré = budúci týždeň
  - každý kurz má 2-3 priradené úlohy

Eventy (5): prednášky + odovzdania na tento týždeň

Poznámky (4): min. 200 slov každá, reálny obsah
  (kratší obsah dáva horšie quiz otázky od AI)
  Napríklad: "TCP/IP sieťové protokoly", "Sorting algoritmy",
             "React hooks a lifecycle", "Taylorov rad"
```

Demo účet: `demo@student.muni.cz` — heslo nastaviť v Supabase Admin.

---

## 8. Testy

### 8.1 Unit testy (Vitest)

**Nové test súbory:**

| Súbor | Čo testuje |
|---|---|
| `src/lib/urgency.test.ts` | Urgency badge logika — `dueDate < 1d → 'high'` atď. |
| `src/lib/groupTasks.test.ts` | groupBy dueDate bucket (Dnes / Týždeň / Neskôr) |
| `src/lib/readingTime.test.ts` | Word count + čas čítania výpočet |
| `src/components/notes/QuizModal.test.ts` | Quiz state machine — výber odpovede, prechod na ďalšiu, záverečné skóre |
| `apps/backend/src/routes/ai.test.ts` | Backend: mock OpenAI response → správny formát odpovede |

Existujúce testy (`timeline-utils.test.ts`) zostávajú, netreba meniť.

### 8.2 E2E testy (Playwright)

**Nové test súbory v `apps/frontend/e2e/`:**

| Súbor | Scenár |
|---|---|
| `auth.spec.ts` | Login → redirect na `/today`, neautorizovaný prístup na `/today` → redirect na `/login` |
| `tasks.spec.ts` | Vytvoriť task → zobraziť v zozname → toggle done → badge sa zmení |
| `notes-quiz.spec.ts` | Otvoriť poznámku → klik `Quiz me` → modal sa otvorí → odpovede fungujú |
| `ai-copilot.spec.ts` | Otvoriť AI panel → Brief tab sa načíta → Chat tab: odoslať správu → odpoveď sa zobrazí |

**Poznámka k e2e a AI:** AI endpointy v Playwright testoch mockuje `page.route()` — testy nevolajú skutočný E-infra API, aby boli deterministické a rýchle.

---

## 9. Čo nerobíme (YAGNI)

- Teacher portal — nie je v demo flow
- Admin panel API — nie je v demo flow
- AI streaming responses — overkill pre demo
- Perzistovanie chat histórie v DB — nie je potrebné
- Notifikácie, Pomodoro timer
- Mobile-first responsive — desktop demo postačuje, mobile drawer pre AI panel je nice-to-have

---

## 10. Definition of Done

Prezentácia je ready keď:

- [ ] Celý demo flow beží bez chyby: Login → Today → Tasks → Notes → Timeline → Courses
- [ ] `/today` bez session redirectuje na `/login` (AuthGuard funguje)
- [ ] Courses zobrazuje reálne dáta z API (nie mock)
- [ ] AI Copilot panel: otvorí sa, Brief sa načíta, Chat odpovie
- [ ] `Quiz me` vygeneruje 5 otázok, správne/nesprávne odpovede sa farbia
- [ ] `Ask AI` odpovie na otázku na základe obsahu poznámky
- [ ] Demo seed dáta sú naplnené — DB nie je prázdna pri prezentácii
- [ ] Dark mode funguje konzistentne na všetkých stránkach
- [ ] Žiadne `console.error` v DevTools počas celého demo flow
- [ ] Unit testy: `pnpm test` prechádza bez failed testov
- [ ] E2E testy: `pnpm test:e2e` prechádza (vrátane mocknutých AI testov)
