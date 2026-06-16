# Teacher Agent + Materials Read Access — Design

**Date:** 2026-06-13  
**Status:** Approved

---

## Goal

Extend the existing AI agent (`POST /ai/agent`) so that:

1. A teacher can assign tasks to groups or individual students via the AI panel.
2. Both students and teachers can browse study materials via the agent (read-only).
3. The system uses a single endpoint — role is detected server-side from the JWT.
4. Teacher write actions (create_assignment, assign_task_to_student) require the same user-confirmation flow as student write actions.

---

## Architecture

Single endpoint `POST /ai/agent` auto-detects the caller's role from `authUser.roles`. Based on role it selects:

- a different **system prompt**
- a different **tool set** (teacher sees all student tools + teacher-only tools)

No frontend changes required — `AgentTab.tsx` stays unchanged.

---

## Section 1 — Tool Manifest (`apps/backend/src/ai/tools.ts`)

### New tools added

| Tool                     | Type            | Endpoint called                     |
| ------------------------ | --------------- | ----------------------------------- |
| `list_course_materials`  | read            | `GET /courses/:courseId/materials`  |
| `list_groups`            | read            | `GET /groups`                       |
| `list_group_members`     | read            | `GET /groups/:groupId`              |
| `list_students`          | read            | `GET /users/search?q=`              |
| `create_assignment`      | write (confirm) | `POST /groups/:groupId/assignments` |
| `assign_task_to_student` | write (confirm) | `POST /tasks/assign`                |

### Exports

```typescript
export const STUDENT_TOOLS: ChatCompletionTool[]; // existing tools + list_course_materials
export const TEACHER_TOOLS: ChatCompletionTool[]; // STUDENT_TOOLS + 5 teacher tools above
export function getToolsForRole(roles: string[]): ChatCompletionTool[];
export const TOOL_MUTATES: Record<string, boolean>; // extended with new tools
```

`list_course_materials`, `list_groups`, `list_group_members`, `list_students` → `false` (read).  
`create_assignment`, `assign_task_to_student` → `true` (confirm required).

---

## Section 2 — New Backend Endpoint (`apps/backend/src/routes/tasks.ts`)

### `POST /tasks/assign`

Teacher-only endpoint to create a task directly for a student.

**Auth:** TEACHER role required (403 otherwise).

**Body (Zod):**

```typescript
z.object({
  studentId: z.number(),
  title: z.string().min(1),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  courseId: z.number().optional(),
});
```

**Logic:**

1. Check `TEACHER` role → 403 if missing.
2. Look up student by `studentId` → 404 if not found.
3. `db.insert(tasks).values({ userId: studentId, title, dueDate, description, courseId, ... })`.
4. `logAction(db, authUser.id, "Teacher assigned task to student studentId")`.
5. Return created task.

No changes to existing task endpoints.

---

## Section 3 — Executor (`apps/backend/src/ai/executor.ts`)

New cases in the `executeTool` switch:

```
list_course_materials(courseId) → GET /courses/:courseId/materials
list_groups()                   → GET /groups
list_group_members(groupId)     → GET /groups/:groupId
list_students(q)                → GET /users/search?q=:q
create_assignment(groupId, title, dueDate, description?) → POST /groups/:groupId/assignments
assign_task_to_student(studentId, title, dueDate?, description?, courseId?) → POST /tasks/assign
```

All calls use `callApi(method, path, authHeader, body?)` — same pattern as existing cases.

---

## Section 4 — Agent Loop (`apps/backend/src/routes/ai.ts`)

### Role detection

```typescript
const isTeacher = authUser.roles.includes('TEACHER');
```

### Tool selection

```typescript
tools: getToolsForRole(authUser.roles);
```

### System prompts

**Student prompt:**

> "You are an AI assistant for a student. Today is {today}. Help with tasks, notes, events, and courses. You can browse study materials for courses. Be concise. Never expose raw JSON. Respond in {langLabel}."

**Teacher prompt:**

> "You are an AI assistant for a university teacher. Today is {today}. You can: assign tasks to groups or individual students, view groups and their members, search students by name, browse study materials. Never share one student's data with another. Be concise. Respond in {langLabel}."

Confirmation flow (confirm card), rate-limit, 6-iteration cap — unchanged.

---

## Key Business Rules

- Teacher writes (create_assignment, assign_task_to_student) require user confirmation — same as student writes.
- Materials are read-only for both roles — no create/delete material tools.
- Student cannot call teacher-only tools — `getToolsForRole` ensures the model never sees them.
- `assign_task_to_student` creates a task owned by `studentId`, not the teacher — teacher identity preserved in audit log only.
- Soft-delete and audit-log rules apply to all new mutations.

---

## Out of Scope

- Teacher viewing submitted student tasks (eval flow is separate).
- Material upload (file content) — only URL/title/description.
- Streaming responses.
- Any changes to `AgentTab.tsx` or frontend routing.
