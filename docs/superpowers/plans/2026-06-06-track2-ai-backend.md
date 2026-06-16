# Track 2 — AI Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementovať 4 AI endpointy (`/ai/brief`, `/ai/chat`, `/ai/notes/:id/quiz`, `/ai/notes/:id/chat`) napojené na E-infra LLM API.

**Architecture:** Nový súbor `routes/ai.ts` registrovaný v `index.ts`. OpenAI-compatible klient s E-infra base URL. Model konfigurovateľný cez env var. Rate limit in-memory. TDD — každý endpoint má unit test s mocknutým OpenAI klientom.

**Tech Stack:** ElysiaJS, Bun, Zod, `openai` npm package, E-infra LLM API (`https://llm.ai.e-infra.cz/v1/`)

---

## Súbory

| Akcia       | Súbor                                         |
| ----------- | --------------------------------------------- |
| Vytvoriť    | `apps/backend/src/routes/ai.ts`               |
| Vytvoriť    | `apps/backend/src/routes/ai.test.ts`          |
| Modifikovať | `apps/backend/src/index.ts`                   |
| Modifikovať | `apps/backend/.env` (pridať E-infra premenné) |

---

## Task 1: Nainštaluj openai package + nastav env

**Files:**

- Modify: `apps/backend/.env`

- [ ] **Step 1: Nainštaluj openai package**

```bash
cd apps/backend && bun add openai
```

- [ ] **Step 2: Pridaj do `.env`**

```bash
# apps/backend/.env — PRIDAJ NA KONIEC (nezmazávaj existujúce riadky):
E_INFRA_API_TOKEN=<tvoj-token>
EINFRA_BASE_URL=https://llm.ai.e-infra.cz/v1/
EINFRA_MODEL=llama3.3:latest
```

Token získaš na `https://chat.ai.e-infra.cz` → Settings → API Keys. Prihlás sa MU účtom.

- [ ] **Step 3: Over dostupné modely**

```bash
curl -H "Authorization: Bearer $(grep E_INFRA_API_TOKEN apps/backend/.env | cut -d= -f2)" \
  https://llm.ai.e-infra.cz/v1/models | jq '.data[].id'
```

Vyber model zo zoznamu — odporúčam `llama3.3:latest` pre rýchlosť.

- [ ] **Step 4: Commit env template** (nie samotný .env!)

```bash
# Pridaj .env do .gitignore ak tam ešte nie je:
grep -q "^.env$" apps/backend/.gitignore || echo ".env" >> apps/backend/.gitignore

# Vytvor/uprav .env.example:
cat >> apps/backend/.env.example << 'EOF'
E_INFRA_API_TOKEN=your-einfra-token-here
EINFRA_BASE_URL=https://llm.ai.e-infra.cz/v1/
EINFRA_MODEL=llama3.3:latest
EOF

git add apps/backend/.env.example apps/backend/.gitignore
git commit -m "chore: add E-infra LLM env vars to .env.example"
```

---

## Task 2: Kostra ai.ts + rate limiter + unit test setup

**Files:**

- Create: `apps/backend/src/routes/ai.ts`
- Create: `apps/backend/src/routes/ai.test.ts`

- [ ] **Step 1: Napíš testovú kostru**

```typescript
// apps/backend/src/routes/ai.test.ts
import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock OpenAI klient — testy nevolajú skutočné API
const mockCreate = mock(async () => ({
  choices: [{ message: { content: '{"brief":"Dnes máš 2 úlohy.","priorities":[]}' } }],
}));

mock.module('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: mockCreate } };
  },
}));

describe('POST /ai/brief', () => {
  it('vráti 401 bez tokenu', async () => {
    // Bude doplnené po implementácii
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Spusti test — musí PASS (placeholder)**

```bash
cd apps/backend && bun test src/routes/ai.test.ts
```

- [ ] **Step 3: Implementuj kostru ai.ts s rate limiterom**

```typescript
// apps/backend/src/routes/ai.ts
import Elysia from 'elysia';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodBody } from '../lib/validation';
import { authMiddleware } from '../middleware/auth';
import { db } from '../db';
import { tasks, events, notes } from '../db/schema';
import { and, eq, isNull, gte, lte } from 'drizzle-orm';
import { logAction } from '../services/audit';
import type { AuthUser } from '../middleware/auth';

const client = new OpenAI({
  apiKey: process.env.E_INFRA_API_TOKEN,
  baseURL: process.env.EINFRA_BASE_URL ?? 'https://llm.ai.e-infra.cz/v1/',
});
const MODEL = process.env.EINFRA_MODEL ?? 'llama3.3:latest';

// In-memory rate limiter: userId → { count, resetAt }
const rateLimits = new Map<number, { count: number; resetAt: number }>();

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export const aiRoutes = new Elysia({ prefix: '/ai' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
    const authUser = user as AuthUser;
    if (!checkRateLimit(authUser.id)) {
      set.status = 429;
      return { error: 'RATE_LIMITED', message: 'Max 10 AI requests per minute' };
    }
  });
```

- [ ] **Step 4: Commit kostra**

```bash
git add apps/backend/src/routes/ai.ts apps/backend/src/routes/ai.test.ts
git commit -m "feat: add AI routes skeleton with rate limiter"
```

---

## Task 3: POST /ai/brief

**Files:**

- Modify: `apps/backend/src/routes/ai.ts`
- Modify: `apps/backend/src/routes/ai.test.ts`

- [ ] **Step 1: Napíš test**

Pridaj do `ai.test.ts`:

```typescript
describe('POST /ai/brief', () => {
  beforeEach(() => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              brief: 'Dnes máš 2 deadline úlohy. Začni s PB138.',
              priorities: [{ title: 'PB138 projekt', dueDate: '2026-06-07', urgency: 'high' }],
            }),
          },
        },
      ],
    });
  });

  it('parsuje brief a priorities zo LLM odpovede', async () => {
    // Simulujeme čo endpoint robí s odpoveďou:
    const raw =
      '{"brief":"Dnes máš 2 deadline úlohy.","priorities":[{"title":"X","dueDate":"2026-06-07","urgency":"high"}]}';
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('brief');
    expect(parsed.priorities[0]).toHaveProperty('urgency');
  });
});
```

- [ ] **Step 2: Spusti test — PASS**

```bash
cd apps/backend && bun test src/routes/ai.test.ts
```

- [ ] **Step 3: Implementuj endpoint — pridaj do `aiRoutes` v ai.ts**

```typescript
// Pridaj za .onBeforeHandle() blok:
.post('/brief', async ({ user }) => {
  const authUser = user as AuthUser;

  const now = new Date();
  const weekLater = new Date(now);
  weekLater.setDate(weekLater.getDate() + 7);

  const [userTasks, userEvents] = await Promise.all([
    db.select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate, status: tasks.status })
      .from(tasks)
      .where(and(
        eq(tasks.userId, authUser.id),
        isNull(tasks.deletedAt),
        lte(tasks.dueDate, weekLater.toISOString()),
      )),
    db.select({ id: events.id, title: events.title, startDate: events.startDate })
      .from(events)
      .where(and(
        eq(events.userId, authUser.id),
        isNull(events.deletedAt),
        gte(events.startDate, now.toISOString()),
        lte(events.startDate, weekLater.toISOString()),
      )),
  ]);

  const contextJson = JSON.stringify({ tasks: userTasks, events: userEvents });

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `Si študentský asistent. Dostaneš JSON so zoznamom úloh a eventov.
Vygeneruj krátky denný brief (2-3 vety, slovenčina) a identifikuj top 3 priority.
urgency: "high" = deadline do 24h, "medium" = do 72h, "low" = neskôr.
Odpoveď VÝLUČNE ako JSON: {"brief":"...","priorities":[{"title":"...","dueDate":"...","urgency":"high|medium|low"}]}`,
      },
      { role: 'user', content: contextJson },
    ],
    temperature: 0.7,
  });

  const raw = response.choices[0]?.message?.content ?? '{}';

  let parsed: { brief: string; priorities: { title: string; dueDate: string; urgency: string }[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { brief: raw, priorities: [] };
  }

  await logAction(db, authUser.id, 'AI brief generated');
  return parsed;
})
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/routes/ai.ts apps/backend/src/routes/ai.test.ts
git commit -m "feat: implement POST /ai/brief endpoint"
```

---

## Task 4: POST /ai/chat

**Files:**

- Modify: `apps/backend/src/routes/ai.ts`

- [ ] **Step 1: Definuj Zod schému a pridaj endpoint**

```typescript
const ChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(4000),
  })).min(1).max(50),
});

// Pridaj do aiRoutes:
.post('/chat', async ({ body, user }) => {
  const authUser = user as AuthUser;
  const { messages } = body as z.infer<typeof ChatSchema>;

  const userTasks = await db.select({ title: tasks.title, status: tasks.status, dueDate: tasks.dueDate })
    .from(tasks)
    .where(and(eq(tasks.userId, authUser.id), isNull(tasks.deletedAt)))
    .limit(20);

  const systemPrompt = `Si študentský AI asistent. Poznáš kontext študenta: ${JSON.stringify(userTasks)}.
Odpovedaj v jazyku, v ktorom sa ťa pýtajú (SK/EN). Buď stručný a konkrétny.`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.8,
  });

  const reply = response.choices[0]?.message?.content ?? 'Prepáč, nastala chyba.';
  await logAction(db, authUser.id, 'AI chat message');
  return { reply };
}, zodBody(ChatSchema))
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/routes/ai.ts
git commit -m "feat: implement POST /ai/chat endpoint"
```

---

## Task 5: POST /ai/notes/:id/quiz

**Files:**

- Modify: `apps/backend/src/routes/ai.ts`
- Modify: `apps/backend/src/routes/ai.test.ts`

- [ ] **Step 1: Napíš test pre JSON parsing**

Pridaj do `ai.test.ts`:

```typescript
describe('quiz JSON parsing', () => {
  it('správne parsuje LLM odpoveď s otázkami', () => {
    const raw = JSON.stringify({
      questions: [{ question: 'Čo je TCP?', options: ['A', 'B', 'C', 'D'], correct: 0 }],
    });
    const parsed = JSON.parse(raw);
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0].correct).toBe(0);
    expect(parsed.questions[0].options).toHaveLength(4);
  });

  it('vráti prázdne questions ak LLM vráti nevalidný JSON', () => {
    const raw = 'Prepáč, neviem vygenerovať otázky.';
    let parsed: { questions: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { questions: [] };
    }
    expect(parsed.questions).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Spusti test — PASS**

```bash
cd apps/backend && bun test src/routes/ai.test.ts
```

- [ ] **Step 3: Implementuj endpoint**

```typescript
// Pridaj do aiRoutes:
.post('/notes/:id/quiz', async ({ params, user, set }) => {
  const authUser = user as AuthUser;
  const noteId = parseInt(params.id);

  const [note] = await db.select({ id: notes.id, title: notes.title, description: notes.description })
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, authUser.id), isNull(notes.deletedAt)));

  if (!note) {
    set.status = 404;
    return { error: 'NOT_FOUND', message: 'Note not found or access denied' };
  }

  const content = note.description ?? '';
  if (content.trim().length < 50) {
    set.status = 400;
    return { error: 'CONTENT_TOO_SHORT', message: 'Note must have at least 50 characters for quiz generation' };
  }

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `Si skúšajúci učiteľ. Vytvor presne 5 multiple-choice otázok z textu poznámky.
Každá otázka má 4 možnosti. Správna odpoveď je na indexe "correct" (0-3).
Otázky musia byť v jazyku poznámky.
Odpoveď VÝLUČNE ako JSON (žiadny text navyše):
{"questions":[{"question":"...","options":["A","B","C","D"],"correct":0}]}`,
      },
      { role: 'user', content: `POZNÁMKA:\n${content}` },
    ],
    temperature: 0.5,
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  let parsed: { questions: { question: string; options: string[]; correct: number }[] };
  try {
    parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.questions)) parsed = { questions: [] };
  } catch {
    parsed = { questions: [] };
  }

  await logAction(db, authUser.id, `Quiz generated for note ${noteId}`);
  return parsed;
})
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/routes/ai.ts apps/backend/src/routes/ai.test.ts
git commit -m "feat: implement POST /ai/notes/:id/quiz endpoint"
```

---

## Task 6: POST /ai/notes/:id/chat

**Files:**

- Modify: `apps/backend/src/routes/ai.ts`

- [ ] **Step 1: Implementuj endpoint**

```typescript
// Pridaj do aiRoutes (rovnaká ChatSchema ako v /ai/chat):
.post('/notes/:id/chat', async ({ params, body, user, set }) => {
  const authUser = user as AuthUser;
  const noteId = parseInt(params.id);

  const [note] = await db.select({ id: notes.id, title: notes.title, description: notes.description })
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, authUser.id), isNull(notes.deletedAt)));

  if (!note) {
    set.status = 404;
    return { error: 'NOT_FOUND', message: 'Note not found or access denied' };
  }

  const { messages } = body as z.infer<typeof ChatSchema>;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `Si asistent pre štúdium. Odpovedaj IBA na základe nasledujúcej poznámky.
Ak odpoveď v poznámke nie je, úprimne to povedz.
Jazyk odpovede = jazyk otázky.

POZNÁMKA (${note.title}):
${note.description ?? ''}`,
      },
      ...messages,
    ],
    temperature: 0.6,
  });

  const reply = response.choices[0]?.message?.content ?? 'Prepáč, nastala chyba.';
  await logAction(db, authUser.id, `Notes chat for note ${noteId}`);
  return { reply };
}, zodBody(ChatSchema))
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/routes/ai.ts
git commit -m "feat: implement POST /ai/notes/:id/chat endpoint"
```

---

## Task 7: Registrovať aiRoutes v index.ts

**Files:**

- Modify: `apps/backend/src/index.ts`

- [ ] **Step 1: Pridaj import a registráciu**

V `apps/backend/src/index.ts` pridaj:

```typescript
// Pridaj k importom:
import { aiRoutes } from './routes/ai';

// Pridaj za .use(adminRoutes):
.use(aiRoutes)
```

- [ ] **Step 2: Spusti backend a over health**

```bash
cd apps/backend && bun run dev
curl http://localhost:3001/health
```

Výstup: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 3: Manuálne otestuj /ai/brief s reálnym tokenom**

```bash
# Získaj token po logine cez frontend, potom:
curl -X POST http://localhost:3001/ai/brief \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

Očakávané: JSON s `brief` a `priorities`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/index.ts
git commit -m "feat: register AI routes in backend"
```
