# Agent Rich Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Chat tab from AI Copilot panel, add markdown rendering + UI cards to Agent tab so tool results (tasks/events/notes/courses) render as compact cards instead of raw text.

**Architecture (C2):** Backend agent loop tracks the last list-tool result (`lastDisplay`). When the loop finishes, it returns `{ reply, display? }`. Frontend stores `display` on each assistant message and renders cards below the markdown text.

**Tech Stack:** ElysiaJS backend, React + Tailwind, `react-markdown` (already in project), `lucide-react` (already in project).

---

## Task 1 — Remove Chat tab from AICopilotPanel

**File:** `apps/frontend/src/components/ai/AICopilotPanel.tsx`

### Step 1.1 — Fix the import line (line 2)

Change:

```tsx
import { X, Sparkles, MessageSquare, Newspaper } from 'lucide-react';
```

To:

```tsx
import { X, Sparkles, Newspaper } from 'lucide-react';
```

### Step 1.2 — Remove ChatTab import (line 5)

Delete this entire line:

```tsx
import { ChatTab } from './ChatTab';
```

### Step 1.3 — Fix the Tab type (line 8)

Change:

```tsx
type Tab = 'brief' | 'chat' | 'agent';
```

To:

```tsx
type Tab = 'brief' | 'agent';
```

### Step 1.4 — Remove the Chat tab button (lines 47–57)

Delete this entire block:

```tsx
<button
  onClick={() => setTab('chat')}
  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
    tab === 'chat'
      ? 'text-indigo-600 border-b-2 border-indigo-500'
      : 'text-gray-400 hover:text-gray-600'
  }`}
>
  <MessageSquare size={14} />
  Chat
</button>
```

### Step 1.5 — Remove the ChatTab content div (lines 76–78)

Delete this entire block:

```tsx
<div className={tab === 'chat' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}>
  <ChatTab />
</div>
```

### Step 1.6 — Fix the stale comment (line 71)

Change:

```tsx
{
  /* Content — both tabs always mounted, hidden tab just invisible */
}
```

To:

```tsx
{
  /* Content */
}
```

### Step 1.7 — Verify

```bash
pnpm --filter @pb138/frontend build 2>&1 | grep -iE "error TS"
```

Expected: no output.

- [ ] **Commit:**

```bash
git add apps/frontend/src/components/ai/AICopilotPanel.tsx
git commit -m "feat: remove Chat tab from AI Copilot panel"
```

---

## Task 2 — Add `display` field to backend `/ai/agent` response

**File:** `apps/backend/src/routes/ai.ts`

All changes are inside the agent loop block (lines 290–341).

### Step 2.1 — Insert `lastDisplay` variable before the loop

Find this comment + for-loop opening (lines 290–291):

```typescript
    // Agent loop: max 6 iterations to prevent runaway chains.
    for (let i = 0; i < 6; i++) {
```

Replace with:

```typescript
    const LIST_DISPLAY_TOOLS: Record<string, 'tasks' | 'events' | 'notes' | 'courses'> = {
      list_tasks: 'tasks',
      list_events: 'events',
      list_notes: 'notes',
      list_courses: 'courses',
    };
    let lastDisplay:
      | { type: 'tasks' | 'events' | 'notes' | 'courses'; items: unknown[] }
      | undefined;

    // Agent loop: max 6 iterations to prevent runaway chains.
    for (let i = 0; i < 6; i++) {
```

### Step 2.2 — Include `display` in the text reply return (line 304)

Change:

```typescript
return { reply: msg.content ?? '' };
```

To:

```typescript
return { reply: msg.content ?? '', display: lastDisplay };
```

### Step 2.3 — Track `lastDisplay` after read-only tool executes

Find this block (lines 324–328):

```typescript
      // Read-only tool → execute immediately, feed result back to model.
      const result = await executeTool(toolName, toolArgs, authHeader);
      await logAction(db, authUser.id, `AI agent tool: ${toolName}`);

      messages.push({
```

Replace with:

```typescript
      // Read-only tool → execute immediately, feed result back to model.
      const result = await executeTool(toolName, toolArgs, authHeader);
      await logAction(db, authUser.id, `AI agent tool: ${toolName}`);

      if (LIST_DISPLAY_TOOLS[toolName]) {
        const items = Array.isArray(result) ? result : [];
        if (items.length > 0) lastDisplay = { type: LIST_DISPLAY_TOOLS[toolName], items };
      }

      messages.push({
```

### Step 2.4 — Include `display` in the fallback return (line 340)

Change:

```typescript
return { reply: 'Nepodarilo sa dokončiť požiadavku.' };
```

To:

```typescript
return { reply: 'Nepodarilo sa dokončiť požiadavku.', display: lastDisplay };
```

### Step 2.5 — Verify

```bash
cd apps/backend && bun build src/index.ts --outdir /tmp/ai-build-check --target bun 2>&1 | grep -iE "error"
```

Expected: no output.

- [ ] **Commit:**

```bash
git add apps/backend/src/routes/ai.ts
git commit -m "feat: include display data in agent reply for list tool results"
```

---

## Task 3 — Update AgentTab with markdown + display cards

**File:** `apps/frontend/src/components/ai/AgentTab.tsx`

### Step 3.1 — Add new imports (lines 1–3)

Change:

```tsx
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
```

To:

```tsx
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, CheckCircle, XCircle, Calendar, BookOpen, FileText } from 'lucide-react';
import { api } from '@/lib/api';
```

### Step 3.2 — Add `AgentDisplay` type and update `Message` type (lines 5–6)

Change:

```tsx
type Message = { role: 'user' | 'assistant'; content: string };
type PendingAction = { name: string; args: Record<string, unknown>; label: string };
```

To:

```tsx
type AgentDisplay = { type: 'tasks' | 'events' | 'notes' | 'courses'; items: unknown[] };
type Message = { role: 'user' | 'assistant'; content: string; display?: AgentDisplay };
type PendingAction = { name: string; args: Record<string, unknown>; label: string };
```

### Step 3.3 — Add display card components + markdown config

Between `type PendingAction = ...` and `export function AgentTab()`, insert the following. This is new code, nothing is deleted here — just insert it:

```tsx
// ── Display card sub-components ──────────────────────────────────────────────

function TaskCard({ item }: { item: Record<string, unknown> }) {
  const dotColor: Record<string, string> = {
    DONE: 'bg-green-500',
    'IN PROGRESS': 'bg-amber-400',
    TODO: 'bg-gray-400',
  };
  const badgeColor: Record<string, string> = {
    HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  const status = String(item.status ?? 'TODO');
  const priority = String(item.priority ?? 'LOW');
  const dueDate = item.dueDate ? new Date(String(item.dueDate)) : null;
  const overdue = dueDate && dueDate < new Date() && status !== 'DONE';

  return (
    <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
      <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor[status] ?? 'bg-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}
        >
          {String(item.title ?? '')}
        </p>
        {dueDate && (
          <p className={`text-xs ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
            {overdue ? 'Overdue · ' : ''}
            {dueDate.toLocaleDateString()}
          </p>
        )}
      </div>
      {badgeColor[priority] && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${badgeColor[priority]}`}
        >
          {priority}
        </span>
      )}
    </div>
  );
}

function EventCard({ item }: { item: Record<string, unknown> }) {
  const start = item.startDate ? new Date(String(item.startDate)) : null;
  return (
    <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
      <Calendar size={14} className="text-indigo-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {String(item.title ?? '')}
        </p>
        {start && (
          <p className="text-xs text-gray-400">
            {start.toLocaleDateString()}{' '}
            {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

function NoteCard({ item }: { item: Record<string, unknown> }) {
  return (
    <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
      <FileText size={14} className="text-purple-400 shrink-0" />
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
        {String(item.title ?? '')}
      </p>
    </div>
  );
}

function CourseCard({ item }: { item: Record<string, unknown> }) {
  return (
    <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
      <BookOpen size={14} className="text-indigo-400 shrink-0" />
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
        {item.code ? `${item.code} — ` : ''}
        {String(item.name ?? '')}
      </p>
    </div>
  );
}

function DisplayCards({ display }: { display: AgentDisplay }) {
  const items = display.items as Record<string, unknown>[];
  if (items.length === 0) return null;
  const label: Record<string, string> = {
    tasks: 'Tasks',
    events: 'Events',
    notes: 'Notes',
    courses: 'Courses',
  };
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-0.5">
        {label[display.type]} ({items.length})
      </p>
      {items.map((item, i) => {
        if (display.type === 'tasks') return <TaskCard key={i} item={item} />;
        if (display.type === 'events') return <EventCard key={i} item={item} />;
        if (display.type === 'notes') return <NoteCard key={i} item={item} />;
        return <CourseCard key={i} item={item} />;
      })}
    </div>
  );
}

const mdComponents = {
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mb-1 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc pl-4 space-y-0.5 mb-1">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal pl-4 space-y-0.5 mb-1">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
};
```

### Step 3.4 — Strip `display` when sending to API (line 32 inside `send()`)

Change:

```tsx
const body: Record<string, unknown> = { messages: newMessages };
```

To:

```tsx
const body: Record<string, unknown> = {
  messages: newMessages.map(({ role, content }) => ({ role, content })),
};
```

The backend Zod schema only accepts `{ role, content }` — sending the extra `display` field would cause a 422 validation error.

### Step 3.5 — Update the API response type

Change:

```tsx
      const res = await api.post<{ reply?: string; pendingAction?: PendingAction }>(
```

To:

```tsx
      const res = await api.post<{ reply?: string; pendingAction?: PendingAction; display?: AgentDisplay }>(
```

### Step 3.6 — Store `display` on the assistant message

Change:

```tsx
setMessages((prev) => [...prev, { role: 'assistant', content: res.reply! }]);
```

To:

```tsx
setMessages((prev) => [...prev, { role: 'assistant', content: res.reply!, display: res.display }]);
```

### Step 3.7 — Update the message bubble renderer

Find this block (lines 69–81):

```tsx
{
  messages.map((m, i) => (
    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
          m.role === 'user'
            ? 'bg-indigo-500 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
        }`}
      >
        {m.content}
      </div>
    </div>
  ));
}
```

Replace with:

```tsx
{
  messages.map((m, i) => (
    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {m.role === 'user' ? (
        <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm bg-indigo-500 text-white">
          {m.content}
        </div>
      ) : (
        <div className="max-w-[95%] rounded-xl px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
          <ReactMarkdown components={mdComponents}>{m.content}</ReactMarkdown>
          {m.display && <DisplayCards display={m.display} />}
        </div>
      )}
    </div>
  ));
}
```

### Step 3.8 — Verify

```bash
pnpm --filter @pb138/frontend build 2>&1 | grep -iE "error TS"
```

Expected: no output.

- [ ] **Commit:**

```bash
git add apps/frontend/src/components/ai/AgentTab.tsx
git commit -m "feat: markdown rendering and rich display cards in AI Agent tab"
```

---

## Task 4 — Smoke test

- [ ] Start backend: `cd apps/backend && bun run dev`
- [ ] Start frontend (separate terminal): `pnpm --filter @pb138/frontend dev`
- [ ] Open `http://localhost:5173`, log in
- [ ] Open AI Copilot panel → verify only **Brief** and **Agent** tabs (no Chat)
- [ ] Switch to **Agent** → type `ukáž mi moje úlohy` → reply renders as markdown (no raw asterisks) + task cards appear below the text
- [ ] Type `ukáž mi moje eventy` → event cards appear
- [ ] Type `vytvor mi úlohu Testovacia úloha` → confirm card appears → click **Potvrdiť** → task created, no display cards (write ops don't touch `lastDisplay`)
- [ ] Toggle dark mode in Profile → cards readable in dark

- [ ] **Push:**

```bash
git push
```

---

## Self-review notes

- `display` is `undefined` on write paths: the mutating-tool branch returns `pendingAction` before reaching `lastDisplay` update ✓
- `display` is `undefined` if list tool returns empty array (`items.length > 0` guard) ✓
- API receives only `{ role, content }` — `display` stripped in step 3.4 ✓
- `react-markdown` already installed (used in `NoteAIChat.tsx`) — no new dependency ✓
- `ChatTab.tsx` stays on disk; it's just no longer imported ✓

---

## TODO — Fix e2e tests

Playwright e2e tests were failing (17-20 tests) due to Supabase v2 localStorage key format change. The fix was applied to the e2e spec files (updated localStorage key from `supabase.auth.token` to the v2 format). However, some tests may still have timing issues with `animate-pulse` skeleton loaders. These need to be investigated and fixed before CI is green.
