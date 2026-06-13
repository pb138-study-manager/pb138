# AI Agent + MCP Server Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn the stateless AI Copilot into an agent that can perform any user action (tasks/notes/events/courses CRUD + search) with confirmation for writes, expose the same capabilities to external clients via an MCP server, and restructure the Today screen into AI / Tasks / Events tabs.

**Architecture:** "Agent as API client." Both the in-app agent loop and the standalone MCP server execute actions by calling the **existing REST endpoints** over HTTP with the user's token. Tool definitions live in one shared manifest derived from the existing Zod schemas. No refactoring of existing routes — the REST API stays the single source of truth.

**Tech Stack:** Backend ElysiaJS + Bun + Drizzle + OpenAI SDK (E-infra `qwen3.5`). Frontend React + TanStack Router + react-i18next. MCP server: new Bun package using `@modelcontextprotocol/sdk` (stdio transport).

---

## Context

The AI feature is the centerpiece of this project. Today the AI backend (`apps/backend/src/routes/ai.ts`) is **stateless** — plain `chat.completions` calls with no tool-calling; it can talk *about* the user's data but cannot *act* on it. We want the AI to do everything a user can: create/edit/complete/delete tasks, manage notes/events/courses, and search the app. We also need a standalone **MCP server** so external AI clients (Claude Desktop, etc.) can act in Student OS on a user's behalf. Finally, the Today screen becomes tabbed with AI as the primary tab.

## Decisions (locked during brainstorming)

1. **MCP target:** external clients (Claude Desktop connects to Student OS).
2. **Capability surface:** full — tasks (CRUD + subtasks + toggle), notes & folders, events, courses + enroll, global search.
3. **Confirmation model:** **reads auto-run; every write (create/edit/delete) requires user confirmation** in the in-app chat. MCP writes execute directly (the external client is the human-in-the-loop).
4. **Web search:** out of scope (app-only). Future stretch.
5. **MCP auth:** Personal Access Token (PAT). Local stdio MCP server + long-lived token generated in Profile.
6. **Today tabs:** `AI` (default) / `Tasks` / `Events`.

## Key existing code to reuse

- `apps/backend/src/middleware/auth.ts:18` — `resolveUser(token)`, the single auth chokepoint (extend for PAT).
- `apps/backend/src/routes/tasks.ts` — `CreateTaskSchema` / `UpdateTaskSchema` (lines ~16-36); reuse as tool-schema source.
- `apps/backend/src/routes/{notes,events,folders,courses}.ts` — existing CRUD endpoints the executor calls.
- `apps/backend/src/routes/ai.ts` — existing `/ai/brief`, `/ai/chat`, rate-limit map, E-infra client config (lines 11-28).
- `apps/frontend/src/components/ai/{AICopilotPanel,BriefTab,ChatTab}.tsx` + `@/context/AIPanelContext`.
- `apps/frontend/src/routes/today/index.tsx` — current single-scroll Today page.
- `apps/frontend/src/lib/api.ts` — fetch wrapper using Supabase session token.
- `apps/backend/src/db/schema.ts:296` — `userIntegrations` (pattern reference for new table).

## Risk #1 — verify FIRST ✅ DONE

`qwen3.5` na E-infra **podporuje** tool-calling natívne. Overené probe skriptom (`scripts/probe-tools.ts`) — `tool_calls` obsahoval `get_weather` s `{city: "Brno"}`.

---

## Part 0 — Probe model tool-calling ✅ DONE

### Task 0: Verify tool-calling support
- [x] Probe skript `apps/backend/scripts/probe-tools.ts` napísaný a spustený.
- [x] Výsledok: `tool_calls` funguje. Pokračujeme podľa pôvodného plánu.

---

## Part A — PAT auth (backend)

### Task A1: `access_tokens` table
**Files:** Modify `apps/backend/src/db/schema.ts`; generate migration.

- [ ] Add table `access_tokens`: `id serial pk`, `userId int notnull -> users.id`, `name text notnull`, `tokenHash text notnull`, `prefix text notnull` (first 12 chars, for display), `createdAt timestamp default now`, `lastUsedAt timestamp`, `revokedAt timestamp`.
- [ ] Run `bun run db:generate` then `bun run db:push`.

### Task A2: Token service
**Files:** Create `apps/backend/src/services/tokens.ts`.

- [ ] Implement `generateToken()` — returns `{ token: 'sk_mcp_<random>', hash }`.
- [ ] Implement `hashToken(token)` — deterministic SHA-256 (Bun crypto).

### Task A3: Token endpoints
**Files:** Create `apps/backend/src/routes/tokens.ts`; register in `src/index.ts`.

- [ ] `POST /users/me/tokens` body `{ name }` → create row, return plaintext token once. Audit-log.
- [ ] `GET /users/me/tokens` → list (id, name, prefix, createdAt, lastUsedAt) — never hash.
- [ ] `DELETE /users/me/tokens/:id` → set `revokedAt` (soft). Audit-log. Ownership check.

### Task A4: Extend `resolveUser` for PAT
**Files:** Modify `apps/backend/src/middleware/auth.ts`.

- [ ] If `token.startsWith('sk_mcp_')` → look up by hash where `revokedAt IS NULL`, set `lastUsedAt`, return user. Else fall through to JWT path.

---

## Part B — Tool manifest + executor (backend, shared) ✅ IN PROGRESS

### Task B1: Tool manifest ✅ DONE
**Files:** `apps/backend/src/ai/tools.ts`

- [x] `AGENT_TOOLS` s `list_tasks` a `create_task`.
- [ ] Rozšíriť o: `update_task`, `complete_task`, `delete_task`, `list_notes`, `get_note`, `create_note`, `update_note`, `list_events`, `create_event`, `update_event`, `delete_event`, `list_courses`, `enroll_course`, `search`.
- [x] `TOOL_MUTATES` mapa.

### Task B2: Executor ✅ IN PROGRESS
**Files:** `apps/backend/src/ai/executor.ts`

- [x] `executeTool` s `list_tasks` a `create_task`.
- [ ] Rozšíriť o zvyšné nástroje.
- [ ] Defaulty pre `create_task`: `dueDate = today`, `priority = LOW` ak nie sú zadané.

### Task B3: Global search endpoint
**Files:** Create `apps/backend/src/routes/search.ts`; register in `index.ts`.

- [ ] `GET /search?q=` → fulltext cez tasks/notes/events/courses. Max 10 výsledkov na entitu.

---

## Part C — Agent loop (backend) ✅ DONE

### Task C1: `/ai/agent` endpoint ✅ DONE
**Files:** `apps/backend/src/routes/ai.ts`

- [x] `POST /ai/agent` s rate-limitom, tool-calling loop, confirm gate, max 6 iterácií.
- [ ] Fix: po potvrdení a vykonaní akcie loop pokračuje zbytočne — vrátiť reply ihneď po `confirm`.

---

## Part D — Today tabs (frontend)

### Task D1: Tab shell
**Files:** Modify `apps/frontend/src/routes/today/index.tsx`; i18n keys do `en.json` + `cs.json`.

- [ ] 3 taby: AI (default) / Tasks / Events. Greeting + progress bar zostávajú nad tabmi.
- [ ] Tasks tab = existujúce TaskSection bloky. Events tab = zoznam eventov. AI tab = `<AgentTab />`.

---

## Part E — Agent chat UI (frontend) ✅ IN PROGRESS

### Task E2: AgentTab component ✅ DONE
**Files:** `apps/frontend/src/components/ai/AgentTab.tsx`

- [x] Chat UI s confirm kartou, auto-scroll, Enter na odoslanie.
- [x] Zapojený do `AICopilotPanel` ako tretia záložka "Agent".
- [ ] Markdown rendering (rovnaký ako ChatTab).

### Task E3: Brief v AI tabe
- [ ] `BriefTab` obsah hore, agent chat dole v Today AI tabe.

---

## Part F — MCP server (new package)

### Task F1: Scaffold
**Files:** `apps/mcp-server/{package.json,tsconfig.json,src/index.ts,README.md}`

- [ ] Bun package, dep `@modelcontextprotocol/sdk`. Env: `STUDENT_OS_API_URL`, `STUDENT_OS_TOKEN`.
- [ ] stdio `Server` s `ListTools` + `CallTool` handlermi.

### Task F2: Tools over REST
**Files:** `apps/mcp-server/src/tools.ts`, `src/client.ts`

- [ ] Rovnaké názvy nástrojov ako `AGENT_TOOLS`. `CallTool` → `fetch` REST s PAT tokenом. Writes bez confirm.

### Task F3: Docs
- [ ] README: ako vygenerovať PAT v Profile + `claude_desktop_config.json` snippet.

---

## Part G — Profile token UI (frontend)

### Task G1: MCP access card
**Files:** `apps/frontend/src/routes/profile/index.tsx` alebo `components/profile/McpTokensCard.tsx`

- [ ] Zoznam tokenov, "Generovať token" (zobraziť plaintext raz s copy tlačidlom), "Zrušiť".

---

## Known bugs (fix before continuing)

1. **Loop po confirm pokračuje** — po vykonaní potvrdenej akcie agent loop zavolá model znova, čo spôsobuje ďalšie volania. Riešenie: po `confirm` vykonaj akciu, zavolaj model raz pre finálnu odpoveď, vráť reply.
2. **Chýbajú defaulty pre create_task** — ak user nezadá `dueDate` ani `priority`, executor by mal doplniť `dueDate = today` a `priority = 'LOW'`.

---

## Verification (end-to-end)

1. **In-app agent:** "vytvor mi úlohu Odovzdať PB138 zajtra" → confirm karta → Potvrdiť → úloha v Tasks tabe.
2. **Read-only:** "koľko mám úloh?" → odpoveď bez confirm karty.
3. **Cancel:** "zmaž úlohu X" → confirm karta → Zrušiť → nič sa nezmaže.
4. **PAT:** Profile → generovať token → `GET /users/me/tokens` zobrazí ho; revoke funguje.
5. **MCP:** Token v `claude_desktop_config.json` → Claude Desktop vidí nástroje → vytvorí úlohu v appke.
6. **Tests:** `bun test` zelený. `pnpm lint` zelený.

## Out of scope (YAGNI)

Web search, remote/OAuth MCP, streaming, persistent chat history.