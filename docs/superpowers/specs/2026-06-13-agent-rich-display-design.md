# AI Agent Rich Display Design

## Goal

Improve the AI Copilot panel so that when the agent returns data (tasks, events, notes, courses), results render as consistent UI cards matching the rest of the app — not as unrendered markdown text. Also remove the redundant Chat tab, leaving only Brief and Agent.

## Scope

Two changes bundled into one spec:

1. **AICopilotPanel** — remove Chat tab
2. **Agent tab** — markdown rendering + structured display cards from backend

## Architecture

**Data flow (C2 approach):** the AI agent backend still drives tool calls. When the loop ends, it passes back both a text `reply` and optional `display` data (the raw items from the last list tool). The frontend renders the text as markdown and the items as UI cards using the same visual language as the Tasks and Timeline pages.

No frontend intent detection, no separate API calls from the frontend — the AI decides what to fetch, the backend exposes the result, the frontend just renders.

---

## Part 1 — AICopilotPanel cleanup

**File:** `apps/frontend/src/components/ai/AICopilotPanel.tsx`

- Change `type Tab = 'brief' | 'chat' | 'agent'` → `type Tab = 'brief' | 'agent'`
- Remove the Chat tab button and its icon import (`MessageSquare`)
- Remove `ChatTab` import and render branch
- Default tab stays `'brief'`

---

## Part 2 — Backend: `display` field in `/ai/agent`

**File:** `apps/backend/src/routes/ai.ts`

### Response type change

```ts
// Before
{ reply: string } | { pendingAction: { name, args, label } }

// After
{ reply: string; display?: AgentDisplay } | { pendingAction: { name, args, label } }

type AgentDisplay = {
  type: 'tasks' | 'events' | 'notes' | 'courses';
  items: unknown[];
};
```

### Logic

In the agent loop, track the last list tool result:

```ts
let lastDisplay: AgentDisplay | undefined = undefined;

// Inside the loop, after executeTool for read-only tools:
const LIST_DISPLAY_TOOLS: Record<string, AgentDisplay['type']> = {
  list_tasks: 'tasks',
  list_events: 'events',
  list_notes: 'notes',
  list_courses: 'courses',
};

if (LIST_DISPLAY_TOOLS[toolName]) {
  const items = Array.isArray(result) ? result : [];
  if (items.length > 0) {
    lastDisplay = { type: LIST_DISPLAY_TOOLS[toolName], items };
  }
}
```

When the loop ends with a reply:

```ts
return { reply: msg.content ?? '', display: lastDisplay };
```

`display` is `undefined` for write operations (create/update/delete) because only list tools populate `lastDisplay`.

---

## Part 3 — Frontend: AgentTab rich rendering

**File:** `apps/frontend/src/components/ai/AgentTab.tsx`

### Message type

```ts
type AgentDisplay = {
  type: 'tasks' | 'events' | 'notes' | 'courses';
  items: unknown[];
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  display?: AgentDisplay;
};
```

### Receiving response

When `res.display` is present, store it on the assistant message:

```ts
setMessages((prev) => [
  ...prev,
  {
    role: 'assistant',
    content: res.reply!,
    display: res.display,
  },
]);
```

### Rendering assistant messages

Replace the current `whitespace-pre-wrap` div with:

1. `<ReactMarkdown>` for the text content (same import pattern as `NoteAIChat.tsx`)
2. If `m.display` is present, render a `<DisplayCards>` component below the text

### DisplayCards component (in same file or separate file `AgentDisplayCards.tsx`)

Renders items based on `display.type`:

**tasks** — for each task item:

```
[● status dot] Title                    [priority badge]
               Due: Jun 20
```

- Status dot: green = DONE, yellow = IN PROGRESS, gray = TODO
- Priority badge: `HIGH` = red bg, `MEDIUM` = yellow bg, `LOW` = gray bg (same colors as TaskCard)
- Due date: formatted as "Jun 20" or "Overdue" in red if past

**events** — for each event item:

```
[calendar icon] Title
                Jun 20, 10:00 – 11:00
```

**notes** — for each note item:

```
[file icon] Title
            folder name (if folderId)
```

**courses** — for each course item:

```
[book icon] PB138 — Student OS
```

All cards: `rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm` — matches the existing card style in the app.

Cards are stacked (full width of panel), not grid layout.

---

## Files changed

| File                                                 | Change                                        |
| ---------------------------------------------------- | --------------------------------------------- |
| `apps/frontend/src/components/ai/AICopilotPanel.tsx` | Remove Chat tab                               |
| `apps/backend/src/routes/ai.ts`                      | Add `lastDisplay` tracking + include in reply |
| `apps/frontend/src/components/ai/AgentTab.tsx`       | Markdown rendering + display cards            |

Optional (if display cards grow large):
| `apps/frontend/src/components/ai/AgentDisplayCards.tsx` | Extracted display card components |

---

## What is NOT in scope

- Interactive cards (toggle done, navigate to detail) — read-only only
- Display for `list_groups`, `list_students`, `list_course_materials` — text reply is sufficient for teacher tools
- Confirm card visual improvement — keep existing plain text confirm card
- Streaming responses
