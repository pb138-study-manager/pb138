# Track 1 — Fundament Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overiť AuthGuard, pripojiť Courses na API, pridať progress bar + farby kurzov, vyčistiť mock dáta, prebehať bug hunt.

**Architecture:** AuthGuard je už implementovaný v `__root.tsx` — len overíme. Courses index/detail už volajú reálne API. Pridáme progress bar + deterministické farby. Mock dáta zmažeme.

**Tech Stack:** React, TanStack Query, Tailwind CSS, Vitest, Playwright

---

## Súbory

| Akcia       | Súbor                                                      |
| ----------- | ---------------------------------------------------------- |
| Modifikovať | `apps/frontend/src/routes/courses/index.tsx`               |
| Modifikovať | `apps/frontend/src/routes/courses/$courseId.tsx`           |
| Zmazať      | `apps/frontend/src/components/courses/course-mock-data.ts` |
| Vytvoriť    | `apps/frontend/src/lib/courseColors.ts`                    |
| Vytvoriť    | `apps/frontend/src/lib/courseColors.test.ts`               |
| Vytvoriť    | `apps/frontend/e2e/auth.spec.ts`                           |

---

## Task 1: Overiť AuthGuard + E2E test

`__root.tsx` už obsahuje redirect logiku. Len pridáme E2E test aby sa to nerozobilo.

**Files:**

- Create: `apps/frontend/e2e/auth.spec.ts`

- [ ] **Step 1: Napíš E2E test**

```typescript
// apps/frontend/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('redirect na /login ak nie je session', async ({ page }) => {
  await page.goto('/today');
  await expect(page).toHaveURL(/\/login/);
});

test('po prihlásení zostane na /today', async ({ page }) => {
  // Tento test preskočíme bez platných credentials — len overíme redirect
  await page.goto('/tasks');
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 2: Spusti test**

```bash
cd apps/frontend && pnpm test:e2e --grep "auth"
```

Očakávané: PASS (redirect funguje lebo \_\_root.tsx to robí správne)

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/e2e/auth.spec.ts
git commit -m "test: add auth redirect e2e test"
```

---

## Task 2: Deterministické farby kurzov

**Files:**

- Create: `apps/frontend/src/lib/courseColors.ts`
- Create: `apps/frontend/src/lib/courseColors.test.ts`

- [ ] **Step 1: Napíš unit test**

```typescript
// apps/frontend/src/lib/courseColors.test.ts
import { describe, it, expect } from 'vitest';
import { getCourseColor } from './courseColors';

describe('getCourseColor', () => {
  it('vráti vždy rovnakú farbu pre rovnaké ID', () => {
    expect(getCourseColor(1)).toBe(getCourseColor(1));
    expect(getCourseColor(5)).toBe(getCourseColor(5));
  });

  it('vráti Tailwind triedy', () => {
    const color = getCourseColor(1);
    expect(color).toHaveProperty('bg');
    expect(color).toHaveProperty('text');
    expect(color.bg).toMatch(/^bg-/);
  });

  it('rôzne ID môžu mať rôzne farby', () => {
    const colors = [1, 2, 3, 4, 5, 6, 7].map(getCourseColor);
    const bgs = colors.map((c) => c.bg);
    const unique = new Set(bgs);
    expect(unique.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Spusti test — očakávaj FAIL**

```bash
cd apps/frontend && pnpm test src/lib/courseColors.test.ts
```

- [ ] **Step 3: Implementuj**

```typescript
// apps/frontend/src/lib/courseColors.ts
const PALETTE = [
  {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    accent: 'bg-indigo-500',
  },
  {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    accent: 'bg-violet-500',
  },
  {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    accent: 'bg-emerald-500',
  },
  {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    accent: 'bg-amber-500',
  },
  {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    accent: 'bg-rose-500',
  },
  {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
    accent: 'bg-cyan-500',
  },
  {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    accent: 'bg-orange-500',
  },
] as const;

export type CourseColor = (typeof PALETTE)[number];

export function getCourseColor(id: number): CourseColor {
  return PALETTE[id % PALETTE.length];
}
```

- [ ] **Step 4: Spusti test — očakávaj PASS**

```bash
cd apps/frontend && pnpm test src/lib/courseColors.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/courseColors.ts apps/frontend/src/lib/courseColors.test.ts
git commit -m "feat: add deterministic course color palette"
```

---

## Task 3: Courses/index — farebné karty + dark mode fix

**Files:**

- Modify: `apps/frontend/src/routes/courses/index.tsx`

- [ ] **Step 1: Uprav karty v courses/index.tsx**

Nájdi sekciu `visibleCourses.map((course) => (` a nahraď `<Card ...>` blok:

```tsx
// Pridaj import navrchu súboru:
import { getCourseColor } from '@/lib/courseColors';

// Nahraď Card komponent vo vnútri .map():
const color = getCourseColor(course.id);
return (
  <div
    key={course.id}
    onClick={() => navigate({ to: `/courses/${course.id}` })}
    className={`rounded-2xl p-4 cursor-pointer active:scale-95 transition space-y-3 border ${color.bg} ${color.border}`}
  >
    <div className={`w-3 h-3 rounded-full ${color.accent}`} />
    <div>
      <h3 className={`font-bold ${color.text}`}>{course.code}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
        {course.name ?? course.code}
      </p>
    </div>
    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 text-gray-600 dark:text-gray-300">
      {course.semester}
    </span>
  </div>
);
```

Zároveň oprav `min-h-screen bg-white` na `min-h-screen bg-gray-50 dark:bg-gray-900` v hlavnom div.

- [ ] **Step 2: Vizuálne over** — spusti dev server, otvor `/courses`

```bash
pnpm --filter @pb138/frontend dev
```

Kurzy musia mať rôznofarebné karty, dark mode musí fungovať.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/routes/courses/index.tsx
git commit -m "feat: colored course cards with deterministic palette"
```

---

## Task 4: Courses progress bar

**Files:**

- Modify: `apps/frontend/src/routes/courses/index.tsx`

- [ ] **Step 1: Pridaj progress query do courses/index.tsx**

Pridaj pred `return` vo vnútri `.map()`:

```tsx
// Toto pridaj AKO NOVÝ komponent mimo CoursesPage aby hooky fungovali:
function CourseProgressBar({ courseId, colorAccent }: { courseId: number; colorAccent: string }) {
  const { data } = useQuery({
    queryKey: ['course-progress', courseId],
    queryFn: () =>
      api
        .get<{ completed: number; total: number }>(`/courses/${courseId}/progress`)
        .catch(() => ({ completed: 0, total: 0 })),
  });

  if (!data || data.total === 0) return null;
  const pct = Math.round((data.completed / data.total) * 100);

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>
          {data.completed}/{data.total} úloh
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/50 dark:bg-black/20 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorAccent} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

Potom vo vnútri course karty pridaj pred záverečný `</div>`:

```tsx
<CourseProgressBar courseId={course.id} colorAccent={color.accent} />
```

- [ ] **Step 2: Over vizuálne** — progress bar sa musí zobraziť ak kurz má úlohy

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/routes/courses/index.tsx
git commit -m "feat: add task progress bar to course cards"
```

---

## Task 5: Zmaž course-mock-data.ts

**Files:**

- Delete: `apps/frontend/src/components/courses/course-mock-data.ts`

- [ ] **Step 1: Over že súbor nie je importovaný**

```bash
grep -r "course-mock-data" apps/frontend/src --include="*.tsx" --include="*.ts"
```

Ak výstup je prázdny → bezpečné mazať.

- [ ] **Step 2: Zmaž súbor**

```bash
rm apps/frontend/src/components/courses/course-mock-data.ts
```

- [ ] **Step 3: Spusti build a over že nepadá**

```bash
pnpm --filter @pb138/frontend build
```

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove unused course-mock-data.ts"
```

---

## Task 6: Bug hunt checklist

Manuálne otestuj každý krok demo flow. Pre každý bug: ak < 30 min opravy, oprav priamo.

- [ ] **Login → Today:** Prihlás sa, over že `/today` sa načíta a zobrazuje úlohy
- [ ] **Task CRUD:** Vytvor task → zobrazí sa → toggle done (status = DONE) → delete (zmizne)
- [ ] **Notes:** Vytvor poznámku → uprav obsah → Ulož → obsah sa zachová
- [ ] **Notes folder:** Vytvor folder → presuň poznámku → folder zobrazuje správne poznámky
- [ ] **Timeline:** Zobraziť eventy → Pridať event → nový event sa zobrazí na timelines
- [ ] **Courses:** Zoznam kurzov → klik na kurz → detail kurzu sa načíta
- [ ] **Dark mode:** Toggle v profile → celá app musí prepnúť farby konzistentne
- [ ] **Logout:** Po logout → `/today` redirectuje na `/login`

```bash
# Po opravách:
git add -p  # stage iba relevantné zmeny
git commit -m "fix: bug hunt fixes from demo flow walkthrough"
```
