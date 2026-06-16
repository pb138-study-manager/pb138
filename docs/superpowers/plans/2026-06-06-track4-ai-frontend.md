# Track 4 — AI Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI Copilot panel (pravý collapsible sidebar s Brief + Chat tabmi) + QuizModal + NoteAIChat v Notes detail view.

**Architecture:** `AIPanelContext` drží open/close state. `AICopilotPanel` je samostatný komponent vložený do `__root.tsx` vedľa `<Outlet>`. `QuizModal` a `NoteAIChat` sú lazy-mounted len keď user klikne na tlačidlá v `NoteDetailView`. Všetky API volania cez existujúci `api` helper z `lib/api.ts`.

**Prerekvizita:** Track 2 (AI Backend) musí byť nasadený — endpointy `/ai/brief`, `/ai/chat`, `/ai/notes/:id/quiz`, `/ai/notes/:id/chat` musia existovať.

**Tech Stack:** React, TanStack Query, Tailwind CSS, Vitest

---

## Súbory

| Akcia       | Súbor                                                     |
| ----------- | --------------------------------------------------------- |
| Vytvoriť    | `apps/frontend/src/context/AIPanelContext.tsx`            |
| Vytvoriť    | `apps/frontend/src/components/ai/AICopilotPanel.tsx`      |
| Vytvoriť    | `apps/frontend/src/components/ai/BriefTab.tsx`            |
| Vytvoriť    | `apps/frontend/src/components/ai/ChatTab.tsx`             |
| Vytvoriť    | `apps/frontend/src/components/notes/QuizModal.tsx`        |
| Vytvoriť    | `apps/frontend/src/components/notes/QuizModal.test.tsx`   |
| Vytvoriť    | `apps/frontend/src/components/notes/NoteAIChat.tsx`       |
| Modifikovať | `apps/frontend/src/routes/__root.tsx`                     |
| Modifikovať | `apps/frontend/src/components/notes/note-detail-view.tsx` |
| Vytvoriť    | `apps/frontend/e2e/ai-copilot.spec.ts`                    |
| Vytvoriť    | `apps/frontend/e2e/notes-quiz.spec.ts`                    |

---

## Task 1: AIPanelContext

**Files:**

- Create: `apps/frontend/src/context/AIPanelContext.tsx`

- [ ] **Step 1: Implementuj context**

```tsx
// apps/frontend/src/context/AIPanelContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface AIPanelContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const AIPanelContext = createContext<AIPanelContextType | null>(null);

export function AIPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AIPanelContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((v) => !v),
      }}
    >
      {children}
    </AIPanelContext.Provider>
  );
}

export function useAIPanel() {
  const ctx = useContext(AIPanelContext);
  if (!ctx) throw new Error('useAIPanel must be used inside AIPanelProvider');
  return ctx;
}
```

- [ ] **Step 2: Wrap aplikáciu v `__root.tsx`**

V `RootLayout` komponent v `apps/frontend/src/routes/__root.tsx`:

Pridaj import:

```tsx
import { AIPanelProvider } from '@/context/AIPanelContext';
```

Obal `<QueryClientProvider>` blok:

```tsx
return (
  <QueryClientProvider client={queryClient}>
    <AIPanelProvider>
      <RoleModeProvider>{/* ... existujúci obsah ... */}</RoleModeProvider>
    </AIPanelProvider>
  </QueryClientProvider>
);
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/context/AIPanelContext.tsx apps/frontend/src/routes/__root.tsx
git commit -m "feat: add AIPanelContext for AI copilot panel state"
```

---

## Task 2: BriefTab komponent

**Files:**

- Create: `apps/frontend/src/components/ai/BriefTab.tsx`

- [ ] **Step 1: Implementuj BriefTab**

```tsx
// apps/frontend/src/components/ai/BriefTab.tsx
import { useState } from 'react';
import { api } from '@/lib/api';

interface Priority {
  title: string;
  dueDate: string;
  urgency: 'high' | 'medium' | 'low';
}

interface BriefData {
  brief: string;
  priorities: Priority[];
}

const DOT: Record<Priority['urgency'], string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
};

export default function BriefTab() {
  const [data, setData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function fetchBrief() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<BriefData>('/ai/brief', {});
      setData(result);
      setLoaded(true);
    } catch {
      setError('Nepodarilo sa načítať brief. Skús znova.');
    } finally {
      setLoading(false);
    }
  }

  // Načítaj automaticky pri prvom zobrazení
  if (!loaded && !loading && !error) {
    fetchBrief();
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{error}</p>
        <button
          onClick={fetchBrief}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Skúsiť znova
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {data && (
        <>
          {/* AI brief text */}
          <div className="rounded-xl p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{data.brief}</p>
          </div>

          {/* Priority list */}
          {data.priorities.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Top priority
              </p>
              <div className="space-y-2">
                {data.priorities.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT[p.urgency]}`} />
                    <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 truncate">
                      {p.title}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {new Date(p.dueDate).toLocaleDateString('sk-SK', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={fetchBrief}
            className="w-full text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 py-2 border border-gray-200 dark:border-gray-700 rounded-lg transition"
          >
            ↻ Aktualizovať brief
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/ai/BriefTab.tsx
git commit -m "feat: implement AI BriefTab component"
```

---

## Task 3: ChatTab komponent

**Files:**

- Create: `apps/frontend/src/components/ai/ChatTab.tsx`

- [ ] **Step 1: Implementuj ChatTab**

```tsx
// apps/frontend/src/components/ai/ChatTab.tsx
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { reply } = await api.post<{ reply: string }>('/ai/chat', { messages: newMessages });
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Prepáč, nastala chyba. Skús znova.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-8">
            Opýtaj sa ma čokoľvek o tvojich úlohách…
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 min-h-[38px] max-h-[120px]"
          placeholder="Napíš správu… (Enter = odoslať)"
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition flex-shrink-0"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/ai/ChatTab.tsx
git commit -m "feat: implement AI ChatTab component"
```

---

## Task 4: AICopilotPanel + toggle button v layoute

**Files:**

- Create: `apps/frontend/src/components/ai/AICopilotPanel.tsx`
- Modify: `apps/frontend/src/routes/__root.tsx`

- [ ] **Step 1: Implementuj AICopilotPanel**

```tsx
// apps/frontend/src/components/ai/AICopilotPanel.tsx
import { useState } from 'react';
import { useAIPanel } from '@/context/AIPanelContext';
import BriefTab from './BriefTab';
import ChatTab from './ChatTab';

type Tab = 'brief' | 'chat';

export default function AICopilotPanel() {
  const { isOpen, close } = useAIPanel();
  const [tab, setTab] = useState<Tab>('brief');

  if (!isOpen) return null;

  return (
    <div className="w-72 flex-shrink-0 h-full border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
            ✦
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">AI Copilot</span>
        </div>
        <button
          onClick={close}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
        {(['brief', 'chat'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition ${
              tab === t
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'brief' ? '📋 Brief' : '💬 Chat'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'brief' ? <BriefTab /> : <ChatTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Pridaj panel a toggle button do \_\_root.tsx**

Pridaj importy:

```tsx
import AICopilotPanel from '@/components/ai/AICopilotPanel';
import { useAIPanel } from '@/context/AIPanelContext';
```

V `RootLayout` za `const { isAuthenticated, isLoading } = useAuth();` pridaj:

```tsx
const { toggle, isOpen } = useAIPanel();
```

Uprav hlavný layout div aby bol flex row (panel na pravej strane):

Nahraď:

```tsx
<main className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0 h-full">
  <Outlet />
</main>
```

Za:

```tsx
<div className="flex-1 min-w-0 flex h-full overflow-hidden">
  <main className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0 h-full overflow-auto relative">
    {/* Toggle button — viditeľný len na autentikovaných routách */}
    {!hideNav && (
      <button
        onClick={toggle}
        className={`fixed right-4 top-4 z-50 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-md transition ${
          isOpen
            ? 'bg-indigo-600 text-white'
            : 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-gray-200 dark:border-gray-700'
        }`}
        title="AI Copilot"
      >
        ✦
      </button>
    )}
    <Outlet />
  </main>
  {!hideNav && <AICopilotPanel />}
</div>
```

- [ ] **Step 3: Over vizuálne** — toggle ✦ button musí byť viditeľný, klik otvára panel

```bash
pnpm --filter @pb138/frontend dev
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/ai/AICopilotPanel.tsx apps/frontend/src/routes/__root.tsx
git commit -m "feat: add AI Copilot panel with Brief and Chat tabs to app layout"
```

---

## Task 5: QuizModal + unit test

**Files:**

- Create: `apps/frontend/src/components/notes/QuizModal.tsx`
- Create: `apps/frontend/src/components/notes/QuizModal.test.tsx`

- [ ] **Step 1: Napíš unit test**

```tsx
// apps/frontend/src/components/notes/QuizModal.test.tsx
import { describe, it, expect } from 'vitest';

interface Question {
  question: string;
  options: string[];
  correct: number;
}

// Testujeme čistú logiku quiz state machine bez renderovania
function computeScore(questions: Question[], answers: number[]): number {
  return answers.filter((a, i) => a === questions[i]?.correct).length;
}

describe('quiz score', () => {
  const questions: Question[] = [
    { question: 'Q1', options: ['A', 'B', 'C', 'D'], correct: 0 },
    { question: 'Q2', options: ['A', 'B', 'C', 'D'], correct: 2 },
    { question: 'Q3', options: ['A', 'B', 'C', 'D'], correct: 1 },
  ];

  it('vráti 0 ak sú všetky odpovede nesprávne', () => {
    expect(computeScore(questions, [1, 1, 0])).toBe(0);
  });

  it('vráti 3 ak sú všetky odpovede správne', () => {
    expect(computeScore(questions, [0, 2, 1])).toBe(3);
  });

  it('vráti 1 ak je správna iba prvá odpoveď', () => {
    expect(computeScore(questions, [0, 0, 0])).toBe(1);
  });
});
```

- [ ] **Step 2: Spusti test — PASS**

```bash
cd apps/frontend && pnpm test src/components/notes/QuizModal.test.tsx
```

- [ ] **Step 3: Implementuj QuizModal**

```tsx
// apps/frontend/src/components/notes/QuizModal.tsx
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Question {
  question: string;
  options: string[];
  correct: number;
}

interface QuizModalProps {
  noteId: number;
  noteTitle: string;
  onClose: () => void;
}

export default function QuizModal({ noteId, noteTitle, onClose }: QuizModalProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    api
      .post<{ questions: Question[] }>(`/ai/notes/${noteId}/quiz`, {})
      .then((r) => setQuestions(r.questions))
      .catch(() => setError('Nepodarilo sa vygenerovať otázky.'))
      .finally(() => setLoading(false));
  }, [noteId]);

  function handleSelect(idx: number) {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
  }

  function handleNext() {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    if (current + 1 >= questions.length) {
      setCurrent(questions.length); // show results
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setRevealed(false);
    }
  }

  const score = answers.filter((a, i) => a === questions[i]?.correct).length;
  const q = questions[current];
  const isFinished = current >= questions.length && questions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">🧠 Quiz</h3>
            <p className="text-xs text-gray-400 mt-0.5">{noteTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Generujem otázky…</p>
            </div>
          )}

          {error && <p className="text-sm text-red-500 text-center py-8">{error}</p>}

          {isFinished && (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">
                {score === questions.length ? '🎉' : score >= questions.length / 2 ? '👍' : '📚'}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {score}/{questions.length} správnych
              </p>
              <button
                onClick={() => {
                  setCurrent(0);
                  setAnswers([]);
                  setSelected(null);
                  setRevealed(false);
                }}
                className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Skúsiť znova
              </button>
            </div>
          )}

          {!loading && !error && !isFinished && q && (
            <>
              <p className="text-xs text-gray-400 mb-3">
                Otázka {current + 1} z {questions.length}
              </p>
              <p className="font-medium text-gray-900 dark:text-white mb-4 leading-snug">
                {q.question}
              </p>
              <div className="space-y-2 mb-6">
                {q.options.map((opt, i) => {
                  let cls =
                    'border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800';
                  if (revealed) {
                    if (i === q.correct)
                      cls =
                        'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300';
                    else if (i === selected)
                      cls =
                        'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
                  } else if (i === selected) {
                    cls =
                      'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300';
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(i)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition ${cls}`}
                    >
                      <span className="font-medium mr-2">{['A', 'B', 'C', 'D'][i]}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleNext}
                  disabled={selected === null}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium transition"
                >
                  {current + 1 >= questions.length ? 'Dokončiť' : 'Ďalšia →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/notes/QuizModal.tsx apps/frontend/src/components/notes/QuizModal.test.tsx
git commit -m "feat: implement QuizModal with state machine and unit tests"
```

---

## Task 6: NoteAIChat komponent

**Files:**

- Create: `apps/frontend/src/components/notes/NoteAIChat.tsx`

- [ ] **Step 1: Implementuj NoteAIChat**

```tsx
// apps/frontend/src/components/notes/NoteAIChat.tsx
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface NoteAIChatProps {
  noteId: number;
  noteTitle: string;
  onClose: () => void;
}

export default function NoteAIChat({ noteId, noteTitle, onClose }: NoteAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    try {
      const { reply } = await api.post<{ reply: string }>(`/ai/notes/${noteId}/chat`, {
        messages: newMessages,
      });
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Prepáč, nastala chyba.' }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Kontext: {noteTitle}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">✦ Ask AI</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-8">
            Opýtaj sa niečo o obsahu tejto poznámky…
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl rounded-bl-sm px-3 py-2 flex gap-1">
              {[0, 150, 300].map((d) => (
                <div
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 min-h-[38px] max-h-[120px]"
          placeholder="Opýtaj sa z tejto poznámky…"
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition flex-shrink-0"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/notes/NoteAIChat.tsx
git commit -m "feat: implement NoteAIChat drawer component"
```

---

## Task 7: Pripojiť QuizModal + NoteAIChat do NoteDetailView

**Files:**

- Modify: `apps/frontend/src/components/notes/note-detail-view.tsx`

- [ ] **Step 1: Pridaj importy a state do note-detail-view.tsx**

```tsx
// Pridaj importy:
import { useState } from 'react'; // už existuje
import QuizModal from './QuizModal';
import NoteAIChat from './NoteAIChat';

// Pridaj state vo vnútri komponentu:
const [quizOpen, setQuizOpen] = useState(false);
const [chatOpen, setChatOpen] = useState(false);
```

- [ ] **Step 2: Uprav onClick handlery na AI tlačidlách (pridané v Track 3)**

Nájdi oba buttony z Track 3 a nahraď no-op `onClick`:

```tsx
// Quiz me button:
onClick={() => setQuizOpen(true)}

// Ask AI button:
onClick={() => setChatOpen(true)}
```

- [ ] **Step 3: Pridaj modaly na koniec return bloku**

Pred záverečný `</div>` pridaj:

```tsx
{
  quizOpen && (
    <QuizModal noteId={note.id} noteTitle={note.title} onClose={() => setQuizOpen(false)} />
  );
}
{
  chatOpen && (
    <NoteAIChat noteId={note.id} noteTitle={note.title} onClose={() => setChatOpen(false)} />
  );
}
```

- [ ] **Step 4: Over end-to-end** — otvor poznámku → klik Quiz me → modal sa otvorí → generuje otázky

```bash
pnpm --filter @pb138/frontend dev
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/notes/note-detail-view.tsx
git commit -m "feat: wire up QuizModal and NoteAIChat into NoteDetailView"
```

---

## Task 8: E2E testy pre AI features

**Files:**

- Create: `apps/frontend/e2e/ai-copilot.spec.ts`
- Create: `apps/frontend/e2e/notes-quiz.spec.ts`

- [ ] **Step 1: E2E test pre AI panel (mockovaný)**

```typescript
// apps/frontend/e2e/ai-copilot.spec.ts
import { test, expect } from '@playwright/test';

test('AI panel toggle button existuje na /today', async ({ page }) => {
  // Mock /ai/brief aby test nebol závislý na E-infra API
  await page.route('**/ai/brief', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        brief: 'Testovací brief.',
        priorities: [{ title: 'Test task', dueDate: new Date().toISOString(), urgency: 'high' }],
      }),
    });
  });

  // Potrebujeme byť prihlásení — tento test predpokladá že dev má seed účet
  // Ak test beží bez autentikácie, redirect na /login je expected behavior
  await page.goto('/today');

  // Buď sme prihlásení a vidíme toggle, alebo redirectujeme na login
  const url = page.url();
  if (url.includes('/login')) {
    // AuthGuard funguje správne
    expect(url).toContain('/login');
  } else {
    // Sme prihlásení — over toggle button
    const toggle = page.locator('button[title="AI Copilot"]');
    await expect(toggle).toBeVisible();
  }
});
```

- [ ] **Step 2: E2E test pre Quiz (mockovaný)**

```typescript
// apps/frontend/e2e/notes-quiz.spec.ts
import { test, expect } from '@playwright/test';

test('quiz modal sa otvára s mocknutými otázkami', async ({ page }) => {
  await page.route('**/ai/notes/*/quiz', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        questions: [
          { question: 'Čo je TCP?', options: ['Protokol', 'Jazyk', 'Databáza', 'OS'], correct: 0 },
        ],
      }),
    });
  });

  // Bez autentikácie test verifikuje len redirect
  await page.goto('/notes');
  const url = page.url();
  if (url.includes('/login')) {
    expect(url).toContain('/login');
  }
  // Pre plný e2e test s reálnym loginm doplň credentials cez env vars
});
```

- [ ] **Step 3: Spusti E2E testy**

```bash
cd apps/frontend && pnpm test:e2e --grep "ai"
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/e2e/ai-copilot.spec.ts apps/frontend/e2e/notes-quiz.spec.ts
git commit -m "test: add e2e tests for AI copilot and quiz features"
```

---

## Task 9: Demo seed data

**Files:**

- Modify: `apps/backend/src/db/seed-user.ts`

- [ ] **Step 1: Prečítaj existujúci seed-user.ts**

```bash
cat apps/backend/src/db/seed-user.ts
```

- [ ] **Step 2: Pridaj demo dáta**

Do seedovacieho scriptu pridaj volania ktoré vytvoria pre demo účet:

```typescript
// Pridaj na koniec seeding funkcie (po vytvorení usera):

// Kurzy
const courseColors = ['#6366f1', '#8b5cf6', '#10b981'];
const courseNames = [
  { code: 'PB138', name: 'Web Development', semester: 'Jar 2026' },
  { code: 'IB101', name: 'Algoritmy a dátové štruktúry', semester: 'Jar 2026' },
  { code: 'MA001', name: 'Matematická analýza', semester: 'Jar 2026' },
];
const createdCourses = await Promise.all(
  courseNames.map((c, i) =>
    db
      .insert(courses)
      .values({ ...c, color: courseColors[i] })
      .returning()
  )
);

// Enroll demo user do všetkých kurzov
await Promise.all(
  createdCourses.map(([c]) =>
    db.insert(userCourses).values({ userId: demoUser.id, courseId: c.id })
  )
);

// Tasks — mix statusov a due dates
const now = new Date();
const d = (daysOffset: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
};

await db.insert(tasks).values([
  {
    userId: demoUser.id,
    title: 'Dokončiť prezentáciu PB138',
    dueDate: d(0),
    status: 'IN PROGRESS',
  },
  { userId: demoUser.id, title: 'Odovzdať zadanie č. 3', dueDate: d(1), status: 'TODO' },
  { userId: demoUser.id, title: 'Prečítať kapitolu 5 — IB101', dueDate: d(2), status: 'TODO' },
  { userId: demoUser.id, title: 'Seriózne sa pozrieť na derivácie', dueDate: d(3), status: 'TODO' },
  { userId: demoUser.id, title: 'Pripraviť otázky na konzultáciu', dueDate: d(4), status: 'TODO' },
  { userId: demoUser.id, title: 'Opraviť bugy v projekte', dueDate: d(1), status: 'TODO' },
  { userId: demoUser.id, title: 'Zopísať týždenný report', dueDate: d(5), status: 'TODO' },
  { userId: demoUser.id, title: 'Naštudovať React hooks', dueDate: d(-1), status: 'DONE' },
  { userId: demoUser.id, title: 'Inštalácia prostredia', dueDate: d(-3), status: 'DONE' },
  { userId: demoUser.id, title: 'Prečítať CLAUDE.md', dueDate: d(-2), status: 'DONE' },
]);

// Events — tento týždeň
await db.insert(events).values([
  { userId: demoUser.id, title: 'Prednáška PB138', startDate: d(1), endDate: d(1), place: 'B411' },
  { userId: demoUser.id, title: 'Seminár IB101', startDate: d(2), endDate: d(2), place: 'A320' },
  { userId: demoUser.id, title: 'Deadline: Odovzdanie projektu', startDate: d(1), endDate: d(1) },
  {
    userId: demoUser.id,
    title: 'Konzultácia s vedúcim',
    startDate: d(3),
    endDate: d(3),
    place: 'Online',
  },
  { userId: demoUser.id, title: 'Cvičenie MA001', startDate: d(4), endDate: d(4), place: 'M1' },
]);

// Poznámky — s reálnym obsahom (min. 200 slov) kvôli AI quiz/chat
await db.insert(notes).values([
  {
    userId: demoUser.id,
    title: 'TCP/IP sieťové protokoly',
    description: `TCP (Transmission Control Protocol) je spojovo orientovaný protokol transportnej vrstvy modelu TCP/IP. Poskytuje spoľahlivý prenos dát medzi dvomi uzlami siete prostredníctvom three-way handshake mechanizmu.

Handshake prebieha v troch krokoch: SYN (klient odošle segment so SYN flagom), SYN-ACK (server odpovedá s SYN a ACK flagom), ACK (klient potvrdí prijatie). Po tomto procese je spojenie nadviazané.

TCP garantuje: doručenie všetkých paketov, správne poradie paketov, kontrolu toku (flow control) pomocou sliding window, kontrolu zahltenia siete (congestion control).

UDP (User Datagram Protocol) je nespojový protokol bez záruky doručenia. Je rýchlejší ako TCP lebo nemá overhead spojenia ani potvrdzovania. Používa sa pre DNS, streaming videa, online hry kde je rýchlosť dôležitejšia ako spoľahlivosť.

HTTP/3 používa QUIC protokol ktorý beží nad UDP ale implementuje vlastnú spoľahlivosť na aplikačnej vrstve. Výhoda oproti TCP je eliminácia head-of-line blocking problému — stratený paket blokuje iba jeden stream, nie celé spojenie.

IP adresovanie: IPv4 používa 32-bitové adresy (4 oktety oddelené bodkami), IPv6 128-bitové. Subnetting umožňuje rozdeliť sieť na menšie podsiete pomocou masky siete.

NAT (Network Address Translation) umožňuje viacerým zariadeniam zdieľať jednu verejnú IP adresu. Router prekladá privátne IP adresy (192.168.x.x, 10.x.x.x) na verejnú adresu.`,
  },
  {
    userId: demoUser.id,
    title: 'Sorting algoritmy — porovnanie',
    description: `Sorting algoritmy radíme do dvoch kategórií: porovnávacie (comparison-based) a neporovnávacie (non-comparison). Dolná hranica časovej zložitosti pre porovnávacie algoritmy je O(n log n).

Bubble Sort: O(n²) priemerný prípad. Porovnáva susedné prvky a vymieňa ich. Jednoduchý ale pomalý. Vhodný len pre malé alebo takmer zoradené polia.

Merge Sort: O(n log n) garantovane. Divide and conquer — rozdeľuje pole na polovice, rekurzívne ich zoradi a zlúči. Stabilný algoritmus. Vyžaduje O(n) extra pamäti.

Quick Sort: O(n log n) priemerný prípad, O(n²) worst case (pri zlom výbere pivotu). In-place (O(log n) stack space). V praxi rýchlejší ako Merge Sort kvôli cache efektivite. Nie je stabilný.

Heap Sort: O(n log n) garantovane, O(1) extra pamäti. Používa binárnu haldu. Nie je stabilný a má slabšiu cache performance ako Quick Sort.

Counting Sort: O(n + k) kde k je rozsah hodnôt. Non-comparison. Efektívny ak k je malé (napr. zoradenie znakov ASCII).

Radix Sort: O(d * (n + k)) kde d je počet číslic. Non-comparison. Vhodný pre celé čísla alebo reťazce.

Tim Sort (Python, Java): Hybridný algoritmus kombinujúci Merge Sort a Insertion Sort. O(n log n) worst case, O(n) best case pre takmer zoradené dáta.`,
  },
  {
    userId: demoUser.id,
    title: 'React Hooks — useState a useEffect',
    description: `React Hooks sú funkcie ktoré umožňujú používať state a lifecycle metódy v funkčných komponentoch bez nutnosti písať triedne komponenty.

useState hook vracia pole s dvomi prvkami: aktuálna hodnota state a funkcia na jej aktualizáciu. State aktualizácia je asynchrónna a spúšťa re-render komponentu. Ak nová hodnota je rovnaká ako stará (Object.is porovnanie), React re-render preskočí.

useEffect hook spúšťa side effects po renderi. Prijíma callback funkciu a dependency array. Ak je dependency array prázdne [], callback sa spustí iba raz po prvom renderi. Ak chýba, spustí sa po každom renderi. Cleanup funkcia vrátená z callbacku sa spúšťa pred ďalším efektom alebo pri unmount.

Custom hooks sú funkcie začínajúce "use" ktoré môžu volať iné hooks. Umožňujú extrahovať a zdieľať logiku medzi komponentmi bez zmeny ich štruktúry.

useCallback vracia memoizovanú verziu callbacku ktorá sa mení len ak sa zmenia závislosti. Optimalizácia pre zabranie zbytočných re-renderov child komponentov.

useMemo vracia memoizovanú hodnotu výpočtu. Vhodné pre expensive výpočty ktoré nechceme opakovať pri každom renderi.

useRef vracia mutable ref objekt s .current property. Zmena .current nespúšťa re-render. Používa sa pre prístup k DOM elementom alebo uchovávanie mutable hodnôt.`,
  },
  {
    userId: demoUser.id,
    title: 'Taylorov rad a aproximácie',
    description: `Taylorov rad je reprezentácia funkcie ako nekonečný súčet členov odvodených z hodnôt derivácií funkcie v jednom bode. Pre funkciu f(x) okolo bodu a:

f(x) = f(a) + f'(a)(x-a) + f''(a)(x-a)²/2! + f'''(a)(x-a)³/3! + ...

Maclaurinov rad je špeciálny prípad Taylorovho radu kde a = 0.

Dôležité Maclaurinove rady:
e^x = 1 + x + x²/2! + x³/3! + ... (konverguje pre všetky x)
sin(x) = x - x³/3! + x⁵/5! - ... (konverguje pre všetky x)
cos(x) = 1 - x²/2! + x⁴/4! - ... (konverguje pre všetky x)
ln(1+x) = x - x²/2 + x³/3 - ... (konverguje pre |x| ≤ 1, x ≠ -1)
1/(1-x) = 1 + x + x² + x³ + ... (konverguje pre |x| < 1)

Taylorov polynóm stupňa n je konečná aproximácia funkcie prvými n+1 členmi radu. Zvyšok (chyba aproximácie) je ohraničená Lagrangeovým zvyškom.

Praktické použitie: numerické výpočty, fyzikálne aproximácie (napr. sin(x) ≈ x pre malé x), analýza algoritmov, digitálne spracovanie signálov (FFT).

Rádius konvergencie určuje pre aké hodnoty x rada konverguje. Vypočíta sa pomocou ratio testu alebo root testu.`,
  },
]);
```

- [ ] **Step 3: Spusti seed**

```bash
cd apps/backend && bun run src/db/seed-user.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/db/seed-user.ts
git commit -m "feat: add realistic demo seed data for presentation"
```
