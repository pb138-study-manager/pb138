# Presentation Sprint Design — Student OS (4 dni)

**Dátum:** 2026-06-06  
**Cieľ:** Prezentácia-ready produkt s AI wow features za 4 dni  
**Kontekst:** Akademická obhajoba pred pedagógmi, PB138 MU Brno  
**Demo flow:** Login → Today → Tasks → Notes → Timeline → Courses

---

## 1. Prístup

Paralelné trackery — 4 členovia tímu, každý má nezávislý track:

| Track | Deň | Zodpovednosť |
|---|---|---|
| **Track 1 — Fundament** | 1 | AuthGuard + Courses → API + bug hunt |
| **Track 2 — AI Backend** | 2 | `/ai` endpointy + OpenAI integrácia |
| **Track 3 — Visual Polish** | 2–3 | Today / Tasks / Notes / Timeline vylepšenia |
| **Track 4 — AI Frontend** | 3–4 | AI Copilot panel + Notes AI features |
| **Spoločne** | 4 | Demo seed data + full run-through + posledný polish |

---

## 2. Track 1 — Fundament (Deň 1)

### 2.1 AuthGuard

Wrapper komponent ktorý chráni všetky autentikované routes.

```tsx
// src/components/AuthGuard.tsx
// Ak session neexistuje → redirect na /login
// Wrap-ne: /today, /tasks, /notes, /notes/:id, /timeline, /courses, /courses/:id, /profile
```

- Použiť `useAuth()` z `lib/auth.tsx` (Supabase session)
- Ak `isLoading === true` → spinner (nie redirect)
- Ak `!isAuthenticated` → `navigate('/login')`
- Aplikovať v `__root.tsx` alebo individuálne na každej route

### 2.2 Courses → API

Vymeniť `course-mock-data.ts` za reálne API volania.

**Nový hook:** `hooks/useCourseManager.ts`

```typescript
// Vzor podľa useTasksManager.ts
// Endpointy: GET /courses, GET /courses/:id, POST /courses/:id/enroll, DELETE /courses/:id/enroll
// GET /courses/:id/progress → % completion tasks
```

- `courses/index.tsx` — zoznam kurzov z API
- `courses/$courseId.tsx` — detail kurzu z API
- Odstrániť import `course-mock-data.ts` zo všetkých komponentov

### 2.3 Bug hunt

Manuálne prejsť celý demo flow a zdokumentovať kritické bugy:

1. Login → auth sync → Today
2. Vytvoriť task → zobraziť → toggle done → delete
3. Vytvoriť poznámku → upraviť → zaradiť do folderu
4. Otvoriť Timeline → zobraziť eventy → pridať event
5. Otvoriť Courses → zobraziť kurzy → detail kurzu

Každý bug → GitHub issue alebo priama oprava ak je malý.

---

## 3. Track 2 — AI Backend (Deň 2)

**API kľúč:** E-infra OpenAI API  
**Env var:** `OPENAI_API_KEY` v `.env`  
**Model:** `gpt-4o-mini` (rýchly + lacný pre demo)

### Nový súbor: `apps/backend/src/routes/ai.ts`

Registrovať v `index.ts` ako `/ai`.

#### POST `/ai/brief`

```typescript
// Načíta tasks (dnes + tento týždeň) a events usera
// Pošle do OpenAI s system promptom ako study advisor
// Vráti: { brief: string, priorities: { title, dueDate, urgency }[] }
// urgency: 'high' | 'medium' | 'low'
```

**System prompt:**
```
Si študentský asistent. Dostaneš zoznam úloh a eventov. 
Vygeneruj krátky (2-3 vety) denný brief v slovenčine a zoraď top 3 priority.
Buď konkrétny, priateľský, motivujúci.
```

#### POST `/ai/chat`

```typescript
// Body: { messages: { role: 'user'|'assistant', content: string }[] }
// Kontext: tasks + courses usera injektované do system promptu
// Vráti: { reply: string }
```

#### POST `/ai/notes/:id/quiz`

```typescript
// Načíta obsah poznámky (overí ownership)
// Pošle do OpenAI s požiadavkou na 5 multiple-choice otázok
// Vráti: { questions: { question, options: string[4], correct: number }[] }
```

**System prompt:**
```
Si učiteľ. Dostaneš text poznámky. Vytvor 5 multiple-choice otázok (A/B/C/D)
na overenie porozumenia. Odpovede musia byť v jazyku poznámky.
Vráť JSON: { questions: [{ question, options: [4 strings], correct: 0-3 }] }
```

#### POST `/ai/notes/:id/chat`

```typescript
// Body: { messages: { role: 'user'|'assistant', content: string }[] }
// Kontext: obsah poznámky injektovaný do system promptu
// AI odpovedá VÝLUČNE na základe textu poznámky (nie z vlastných vedomostí)
// Vráti: { reply: string }
```

**System prompt:**
```
Si asistent pre štúdium. Odpovedaj IBA na základe nasledujúcej poznámky.
Ak odpoveď nie je v poznámke, povedz to úprimne.
Poznámka: {noteContent}
```

### Validácia a auth

Všetky `/ai/*` endpointy:
- `authMiddleware` + `onBeforeHandle` check
- Zod validácia body
- Rate limit: max 10 req/min na usera (jednoduchý in-memory counter)
- `logAction()` na každé AI volanie

---

## 4. Track 3 — Visual Polish (Deň 2–3)

### /today

- Greeting header: `"Dobré ráno, {name} 👋"` (ráno) / `"Dobrý deň"` / `"Dobrý večer"` podľa hodiny
- Progress bar: `"X z Y úloh hotových dnes"` — vypočítané z dnešných taskov
- Empty state s CTA ak nie sú žiadne úlohy: `"Žiadne úlohy na dnes. Chceš nejakú pridať?"`
- Animated checkmark pri toggle done (CSS transition, nie library)

### /tasks

- Farebné priority badges: červená = `dueDate < 1 deň`, žltá = `< 3 dni`, zelená = `> 3 dni`
- Deadline countdown text: `"za 2 dni"`, `"dnes"`, `"oneskorené"`
- Skupinové sekcie: **Dnes** / **Tento týždeň** / **Neskôr** (groupBy dueDate)
- Strikethrough + fade animácia pri označení done

### /notes

- Word count + odhadovaný čas čítania v headerri poznámky (`~2 min čítania`)
- Farebné folder ikony (7 predvolených farieb, user si vyberie pri vytvorení)
- Tlačidlá **🧠 Quiz me** a **✦ Ask AI** v toolbar detail view (implementácia v Track 4)

### /timeline

- Farebné kategórie eventov: kurz = modrá, osobné = zelená, deadline = červená
- Hover tooltip s názvom, časom a miestom eventu
- Tlačidlo **+ Pridať event** prominentné (nie skryté v menu)

### /courses

- Progress bar per kurz (volá `GET /courses/:id/progress`)
- Farebné kurz karty — každý kurz dostane farbu z predvolenej palety (hash z ID)
- Enroll / Unenroll button funkčný a prepojený na API

### Globálne

- Konzistentné loading skeletons na všetkých stránkach (nie prázdna biela plocha)
- Konzistentné error states (nie `undefined` v UI)

---

## 5. Track 4 — AI Frontend (Deň 3–4)

### 5.1 AI Copilot Panel (pravý collapsible sidebar)

**Súbory:**
```
src/components/ai/AICopilotPanel.tsx    — hlavný komponent
src/components/ai/BriefTab.tsx          — Daily brief tab
src/components/ai/ChatTab.tsx           — Chat tab
src/context/AIPanelContext.tsx          — open/close state
```

**Layout:**
- Šírka: 280px, fixná, pravá strana
- Collapsible: tlačidlo `✦` v top bare (header)
- State v React Context — dostupný z každej stránky
- Nezobrazuje sa na `/login`, `/register`, `/verify-email`

**Brief tab:**
```
- Načíta pri prvom otvorení (lazy) — volá POST /ai/brief
- Zobrazí: AI text (2-3 vety) + top 3 priority s farebnými dot indikátormi
  - červená dot = high urgency
  - žltá dot = medium
  - zelená dot = low
- Tlačidlo "↻ Aktualizovať brief" — znova zavolá endpoint
- Loading state: shimmer skeleton
```

**Chat tab:**
```
- Messages array v lokálnom state (session only, neperzistuje)
- Volá POST /ai/chat s celou históriou správ
- Streaming nie je potrebný — počkáme na celú odpoveď (jednoduchšie)
- Enter odošle správu, Shift+Enter = nový riadok
- Auto-scroll na poslednú správu
```

### 5.2 Notes AI — Quiz me

**Komponent:** `src/components/notes/QuizModal.tsx`

```
- Otvára sa tlačidlom "🧠 Quiz me" v note detail toolbar
- Zavolá POST /ai/notes/:id/quiz pri otvorení
- Loading state: "Generujem otázky…" so spinnerom
- Zobrazí otázky jedna po druhej:
  - Číslo otázky (1 z 5)
  - Text otázky
  - 4 možnosti (A/B/C/D) ako klikateľné tlačidlá
  - Po výbere: zelená = správna, červená = nesprávna + zvýraznenie správnej
  - Tlačidlo Ďalšia / Dokončiť
- Na konci: skóre "4/5 správnych 🎉"
```

### 5.3 Notes AI — Ask AI (chat s poznámkou)

**Komponent:** `src/components/notes/NoteAIChat.tsx`

```
- Otvára sa tlačidlom "✦ Ask AI" v note detail toolbar
- Zobrazí sa ako drawer z pravej strany (konzistentné s Copilot panelom)
- Indikátor kontextu: zelená bodka + "Kontext: {názov poznámky}"
- Volá POST /ai/notes/:id/chat
- Rovnaký chat UI ako v Copilot paneli
- História len pre session (neperzistuje)
```

---

## 6. Demo Seed Data (Deň 4)

Rozšíriť `apps/backend/src/db/seed-user.ts` o realistické demo dáta:

```
- 3 kurzy: "PB138 Web Development", "IB101 Algoritmy", "MA001 Matematika"
- 10 úloh: mix statusov, rôzne due dates (niektoré dnes, niektoré tento týždeň)
- 5 eventov na tento týždeň (prednášky, odovzdania)
- 4 poznámky s reálnym obsahom (min. 200 slov každá) — kvôli AI quiz/chat demo
- Každý kurz má 2-3 úlohy priradené
```

Demo účet: `demo@student.muni.cz` / heslo nastaviť cez Supabase admin.

---

## 7. Čo nerobíme (YAGNI)

- Teacher portal — nie je v demo flow, preskočiť
- Admin panel API — nie je v demo flow
- AI streaming responses — overkill pre demo
- Perzistovanie chat histórie — nie je potrebné
- Notifikácie
- Pomodoro timer

---

## 8. Definition of Done

Prezentácia je ready keď:

- [ ] Celý demo flow beží bez chyby od loginu po courses
- [ ] AuthGuard funguje — `/today` bez loginu redirectuje na `/login`
- [ ] Courses zobrazuje reálne dáta z API
- [ ] AI Copilot panel sa otvorí, brief sa načíta, chat odpovie
- [ ] "Quiz me" vygeneruje 5 otázok z poznámky
- [ ] "Ask AI" odpovie na otázku na základe poznámky
- [ ] Demo seed dáta sú naplnené — DB nie je prázdna
- [ ] Dark mode funguje konzistentne na všetkých stránkach
- [ ] Žiadne `console.error` v dev tools počas demo flow
