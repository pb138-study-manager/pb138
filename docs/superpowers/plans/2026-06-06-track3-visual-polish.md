# Track 3 — Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vizuálny polish Today / Tasks / Notes / Timeline stránok. Unit testy pre utility funkcie. Žiadne mock dáta, konzistentné dark mode, loading skeletons.

**Architecture:** Nové utility funkcie (`urgency.ts`, `readingTime.ts`) extrahované ako pure functions — ľahko testovateľné. Komponenty sa upravujú minimálne — len pridávame triedy a malé bloky.

**Tech Stack:** React, Tailwind CSS, Vitest

---

## Súbory

| Akcia       | Súbor                                                     |
| ----------- | --------------------------------------------------------- |
| Vytvoriť    | `apps/frontend/src/lib/urgency.ts`                        |
| Vytvoriť    | `apps/frontend/src/lib/urgency.test.ts`                   |
| Vytvoriť    | `apps/frontend/src/lib/readingTime.ts`                    |
| Vytvoriť    | `apps/frontend/src/lib/readingTime.test.ts`               |
| Modifikovať | `apps/frontend/src/routes/today/index.tsx`                |
| Modifikovať | `apps/frontend/src/components/tasks/tasks-card.tsx`       |
| Modifikovať | `apps/frontend/src/components/notes/note-detail-view.tsx` |
| Modifikovať | `apps/frontend/src/components/notes/folders-view.tsx`     |
| Modifikovať | `apps/frontend/src/routes/timeline/index.tsx`             |

---

## Task 1: Urgency utility + unit test

**Files:**

- Create: `apps/frontend/src/lib/urgency.ts`
- Create: `apps/frontend/src/lib/urgency.test.ts`

- [ ] **Step 1: Napíš unit testy**

```typescript
// apps/frontend/src/lib/urgency.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getUrgency, urgencyBadgeClasses, urgencyCountdownText } from './urgency';

describe('getUrgency', () => {
  it('vracia "high" ak dueDate je dnes', () => {
    const today = new Date().toISOString();
    expect(getUrgency(today)).toBe('high');
  });

  it('vracia "high" ak dueDate je v minulosti (overdue)', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    expect(getUrgency(yesterday)).toBe('high');
  });

  it('vracia "medium" ak dueDate je o 2 dni', () => {
    const twoDays = new Date(Date.now() + 2 * 86_400_000).toISOString();
    expect(getUrgency(twoDays)).toBe('medium');
  });

  it('vracia "low" ak dueDate je o 5 dní', () => {
    const fiveDays = new Date(Date.now() + 5 * 86_400_000).toISOString();
    expect(getUrgency(fiveDays)).toBe('low');
  });

  it('vracia "low" ak dueDate je null', () => {
    expect(getUrgency(null)).toBe('low');
  });
});

describe('urgencyCountdownText', () => {
  it('vracia "oneskorené" pre minulý dátum', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(urgencyCountdownText(past)).toBe('oneskorené');
  });

  it('vracia "dnes" pre dnešný dátum', () => {
    const today = new Date().toISOString();
    expect(urgencyCountdownText(today)).toBe('dnes');
  });

  it('vracia "za 3 dni" pre dátum o 3 dni', () => {
    const threeDays = new Date(Date.now() + 3 * 86_400_000).toISOString();
    expect(urgencyCountdownText(threeDays)).toBe('za 3 dni');
  });
});
```

- [ ] **Step 2: Spusti test — očakávaj FAIL**

```bash
cd apps/frontend && pnpm test src/lib/urgency.test.ts
```

- [ ] **Step 3: Implementuj**

```typescript
// apps/frontend/src/lib/urgency.ts
export type Urgency = 'high' | 'medium' | 'low';

export function getUrgency(dueDate: string | null | undefined): Urgency {
  if (!dueDate) return 'low';
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) return 'high';
  if (diffDays <= 3) return 'medium';
  return 'low';
}

export function urgencyBadgeClasses(urgency: Urgency): string {
  if (urgency === 'high') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (urgency === 'medium')
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
}

export function urgencyDotClass(urgency: Urgency): string {
  if (urgency === 'high') return 'bg-red-500';
  if (urgency === 'medium') return 'bg-amber-500';
  return 'bg-green-500';
}

export function urgencyCountdownText(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'oneskorené';
  if (diffDays === 0) return 'dnes';
  if (diffDays === 1) return 'zajtra';
  return `za ${diffDays} dni`;
}
```

- [ ] **Step 4: Spusti test — PASS**

```bash
cd apps/frontend && pnpm test src/lib/urgency.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/urgency.ts apps/frontend/src/lib/urgency.test.ts
git commit -m "feat: add urgency utility with unit tests"
```

---

## Task 2: ReadingTime utility + unit test

**Files:**

- Create: `apps/frontend/src/lib/readingTime.ts`
- Create: `apps/frontend/src/lib/readingTime.test.ts`

- [ ] **Step 1: Napíš unit testy**

```typescript
// apps/frontend/src/lib/readingTime.test.ts
import { describe, it, expect } from 'vitest';
import { getReadingStats } from './readingTime';

describe('getReadingStats', () => {
  it('vráti 0 slov pre prázdny text', () => {
    expect(getReadingStats('').wordCount).toBe(0);
  });

  it('správne počíta slová', () => {
    expect(getReadingStats('hello world foo').wordCount).toBe(3);
  });

  it('vráti minimálne 1 minútu čítania', () => {
    expect(getReadingStats('hi').minutes).toBe(1);
  });

  it('200 slov = 1 minúta (200 wpm)', () => {
    const text = Array(200).fill('slovo').join(' ');
    expect(getReadingStats(text).minutes).toBe(1);
  });

  it('400 slov = 2 minúty', () => {
    const text = Array(400).fill('slovo').join(' ');
    expect(getReadingStats(text).minutes).toBe(2);
  });
});
```

- [ ] **Step 2: Spusti test — FAIL**

```bash
cd apps/frontend && pnpm test src/lib/readingTime.test.ts
```

- [ ] **Step 3: Implementuj**

```typescript
// apps/frontend/src/lib/readingTime.ts
const WORDS_PER_MINUTE = 200;

export interface ReadingStats {
  wordCount: number;
  minutes: number;
  label: string; // napr. "142 slov · ~1 min čítania"
}

export function getReadingStats(text: string): ReadingStats {
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
  return {
    wordCount,
    minutes,
    label: `${wordCount} slov · ~${minutes} min čítania`,
  };
}
```

- [ ] **Step 4: Spusti test — PASS**

```bash
cd apps/frontend && pnpm test src/lib/readingTime.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/readingTime.ts apps/frontend/src/lib/readingTime.test.ts
git commit -m "feat: add reading time utility with unit tests"
```

---

## Task 3: Today page — greeting + progress bar

**Files:**

- Modify: `apps/frontend/src/routes/today/index.tsx`

- [ ] **Step 1: Pridaj greeting funkciu a progress bar do TodayPage**

Nájdi header sekciu `{/* Header */}` a nahraď `<h1>` riadok:

```tsx
// Pridaj na vrch komponentu pred return:
function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return `Dobré ráno, ${name} 👋`;
  if (h < 18) return `Dobrý deň, ${name} 👋`;
  return `Dobrý večer, ${name} 👋`;
}
```

Nahraď `<h1>` tag:

```tsx
<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
  {getGreeting(t('nav.today'))}
</h1>
```

Potom pridaj progress bar hneď pod `</h1>`:

```tsx
{
  counts.today > 0 && (
    <div className="mt-2 mb-3">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>
          {counts.done} z {counts.today + counts.done} úloh hotových dnes
        </span>
        <span>{Math.round((counts.done / (counts.today + counts.done)) * 100)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${Math.round((counts.done / (counts.today + counts.done)) * 100)}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Pridaj empty state**

Po `<TaskSection title={t('tasks.today')} .../>` bloku, pred backlog sekciou, pridaj podmienku:

```tsx
{
  todayTasks.length === 0 && doneTasks.length === 0 && (
    <div className="text-center py-12 text-gray-400 dark:text-gray-500">
      <p className="text-4xl mb-3">✅</p>
      <p className="font-medium">Žiadne úlohy na dnes</p>
      <p className="text-sm mt-1">Chceš nejakú pridať?</p>
    </div>
  );
}
```

- [ ] **Step 3: Over vizuálne**

```bash
pnpm --filter @pb138/frontend dev
```

Otvor `/today` — musí sa zobraziť greeting a progress bar (ak sú úlohy).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/routes/today/index.tsx
git commit -m "feat: add greeting header and progress bar to today page"
```

---

## Task 4: Tasks page — urgency badges + countdown + animations

**Files:**

- Modify: `apps/frontend/src/components/tasks/tasks-card.tsx`

- [ ] **Step 1: Prečítaj aktuálny tasks-card.tsx**

```bash
cat -n apps/frontend/src/components/tasks/tasks-card.tsx | head -80
```

- [ ] **Step 2: Pridaj urgency badge a countdown**

Na začiatku komponentu (kde je `dueDate` k dispozícii) pridaj:

```tsx
// Pridaj import:
import { getUrgency, urgencyBadgeClasses, urgencyCountdownText } from '@/lib/urgency';

// Vo vnútri komponentu:
const urgency = getUrgency(task.dueDate);
const countdown = urgencyCountdownText(task.dueDate);
```

Na mieste kde sa zobrazuje dueDate, nahraď (alebo obal) dátumový element:

```tsx
{
  task.dueDate && (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${urgencyBadgeClasses(urgency)}`}
      >
        {countdown}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Pridaj strikethrough animáciu pri DONE stave**

Nájdi miesto kde sa zobrazuje `task.title` a obal ho:

```tsx
<span
  className={`transition-all duration-300 ${
    task.status === 'DONE'
      ? 'line-through text-gray-400 dark:text-gray-500 opacity-60'
      : 'text-gray-900 dark:text-white'
  }`}
>
  {task.title}
</span>
```

- [ ] **Step 4: Over vizuálne** — `/tasks` musí zobrazovať farebné badges a strikethrough

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/tasks/tasks-card.tsx
git commit -m "feat: add urgency badges and done animation to task cards"
```

---

## Task 5: Notes — word count + AI button placeholders

**Files:**

- Modify: `apps/frontend/src/components/notes/note-detail-view.tsx`

- [ ] **Step 1: Pridaj word count do note-detail-view.tsx**

Pridaj import:

```tsx
import { getReadingStats } from '@/lib/readingTime';
```

Vo vnútri komponentu, pred `return`:

```tsx
const stats = getReadingStats(content);
```

V header sekcii (vedľa titulku poznámky), pridaj:

```tsx
<span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{stats.label}</span>
```

- [ ] **Step 2: Pridaj AI tlačidlá (no-op — Track 4 doplní logiku)**

V toolbar sekcii (vedľa delete tlačidla) pridaj:

```tsx
<button
  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
  onClick={() => {/* Track 4 doplní: onQuizOpen?.() */}}
>
  🧠 Quiz me
</button>
<button
  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
  onClick={() => {/* Track 4 doplní: onAskAIOpen?.() */}}
>
  ✦ Ask AI
</button>
```

Tieto tlačidlá dostanú reálne handlery keď Track 4 implementuje `QuizModal` a `NoteAIChat`.

- [ ] **Step 3: Over vizuálne** — otvor poznámku, musí sa zobraziť word count a dve tlačidlá

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/notes/note-detail-view.tsx
git commit -m "feat: add word count and AI button placeholders to note detail"
```

---

## Task 6: Notes — farebné folder ikony

**Files:**

- Modify: `apps/frontend/src/components/notes/folders-view.tsx`

- [ ] **Step 1: Prečítaj folders-view.tsx**

```bash
cat -n apps/frontend/src/components/notes/folders-view.tsx | head -60
```

- [ ] **Step 2: Pridaj farby do folder kariet**

Nájdi miesto kde sa rendrujú foldery a pridaj farebné ikony:

```tsx
// Paleta — 7 farieb podľa folder.id % 7
const FOLDER_COLORS = [
  'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400',
  'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
  'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
  'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400',
  'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
];

// Na folder karte, nahraď generickú ikonu:
<div
  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${FOLDER_COLORS[folder.id % 7]}`}
>
  📁
</div>;
```

- [ ] **Step 3: Over vizuálne**

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/notes/folders-view.tsx
git commit -m "feat: add color palette to folder icons in notes"
```

---

## Task 7: Timeline — farebné eventy + hover tooltip + pridaj event button

**Files:**

- Modify: `apps/frontend/src/routes/timeline/index.tsx`

- [ ] **Step 1: Prečítaj timeline/index.tsx**

```bash
cat -n apps/frontend/src/routes/timeline/index.tsx | head -100
```

- [ ] **Step 2: Nájdi EventCard komponent a pridaj farby**

V `apps/frontend/src/components/timeline/EventCard.tsx` nájdi hlavný wrapper div a pridaj farbu na základe eventu:

```tsx
// Pridaj funkciu:
function getEventColor(event: { title?: string }): string {
  const t = (event.title ?? '').toLowerCase();
  if (t.includes('deadline') || t.includes('odovzdanie'))
    return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
  if (t.includes('prednáška') || t.includes('seminár') || t.includes('cvičenie'))
    return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
  return 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10';
}
```

Potom na event wrapper div pridaj `border-l-4 ${getEventColor(event)}`.

- [ ] **Step 3: Pridaj "Pridať event" button do headeru timeline stránky**

V `timeline/index.tsx` nájdi header a over či tam je pridaj event tlačidlo. Ak nie je prominentné, pridaj:

```tsx
<button
  onClick={() => setIsNewEventOpen(true)}
  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition"
>
  + Pridať event
</button>
```

- [ ] **Step 4: Over vizuálne** — eventy majú farby, button je viditeľný

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/routes/timeline/index.tsx apps/frontend/src/components/timeline/EventCard.tsx
git commit -m "feat: colored timeline events and prominent add-event button"
```

---

## Task 8: Globálne — loading skeletons

Pre každú stránku kde je `animate-spin` loader, nahraď ho shimmer skeletonmi.

**Vzor skeleton komponentu:**

```tsx
// Použi kdekoľvek ako placeholder namiesto spinneru:
function SkeletonCard() {
  return <div className="animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 h-16 w-full" />;
}

// Použitie v stránke:
if (isPending) {
  return (
    <div className="px-4 py-6 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
```

- [ ] **Step 1: Nahraď spinner v `/today`** — `routes/today/index.tsx`
- [ ] **Step 2: Nahraď spinner v `/tasks`** — `routes/tasks/index.tsx`
- [ ] **Step 3: Nahraď spinner v `/courses`** — `routes/courses/index.tsx`
- [ ] **Step 4: Nahraď spinner v `/notes`** — `routes/notes/index.tsx`

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/routes/
git commit -m "feat: replace spinners with shimmer skeleton loaders"
```
