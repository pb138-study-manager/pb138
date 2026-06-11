# Sprint D — Notes: Course Linking + Click-to-Edit + Markdown

**Date:** 2026-06-11
**Scope:** Three connected improvements to the Notes feature: link notes to courses, click-to-edit note content, and markdown rendering.

---

## Summary

| Feature | Entry point | Backend change? |
|---|---|---|
| Create note linked to course | Course detail → Notes tab → `+` | No — API already accepts `courseId` |
| Link/unlink note to course | NoteDetailView → course badge dropdown | No — PATCH `/notes/:id` already accepts `courseId` |
| Click-to-edit | Click note content area → auto-edit mode | No |
| Markdown render | view mode renders MD, edit mode is raw textarea | `react-markdown` package install |

No backend changes needed. Backend notes routes already accept and return `courseId` in both POST and PATCH.

---

## Feature 1 — Create note from Course Detail (Option A)

**File:** `apps/frontend/src/routes/courses/$courseId.tsx`

The Notes tab already renders `notes.filter(n => n.courseId === Number(courseId))`. It shows "No notes for this course" when empty, and a plain list otherwise. It has no `+` button.

**Change:** Add a `+` button next to the "Notes" heading. Clicking it shows an inline form (same pattern as the Tasks inline form in the same file):

- Title input (autofocus)
- Cancel + Create buttons
- On Create: `POST /notes` with `{ title, description: '', courseId: Number(courseId) }` → invalidate `['notes']` query
- No folder association — `folderId: null`

The new note appears immediately in the Notes tab list. Clicking a note in the list navigates to `/notes` with the note open (or opens it inline — see notes on navigation below).

**Navigation from course Notes tab:** Keep it simple — clicking a note card navigates to `/notes/$noteId` route. Do NOT open an inline NoteDetailView inside the course page.

---

## Feature 2 — Link/Unlink Note to Course (Option C)

**File:** `apps/frontend/src/components/notes/note-detail-view.tsx`

Add a course badge between the stats row and the AI buttons row. The badge shows:
- If `note.courseId` is set: `📚 <course code> ▾` (indigo pill, clickable)
- If no course: `+ Kurz` (ghost pill, clickable)

Clicking the badge opens a small dropdown (absolute positioned, `z-10`) listing all enrolled courses plus a "— Bez kurzu" option.

Selecting a course: `PATCH /notes/:id` with `{ courseId: selectedId }` → update React Query cache.
Selecting "— Bez kurzu": `PATCH /notes/:id` with `{ courseId: null }` → update cache.

The dropdown closes on selection or click-outside (`useEffect` + `mousedown` listener).

**Course list source:** `useQuery(['courses'])` → `GET /courses` — already fetched on the courses page. Add this query inside NoteDetailView (TanStack Query deduplicates, no extra network call if already cached).

**State in NoteDetailView:**
```typescript
const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
```

---

## Feature 3 — Click-to-Edit + Markdown Rendering

**File:** `apps/frontend/src/components/notes/note-detail-view.tsx`
**Package:** `react-markdown` (install via `pnpm --filter @pb138/frontend add react-markdown`)

### View mode (default)

- Note content rendered via `<ReactMarkdown>` — supports headings, bold, italic, lists, code spans, code blocks
- A subtle hint `✎` label visible on hover over the content area
- Clicking anywhere on the content area → switches to edit mode
- Note title: also click-to-edit inline (click title text → `<input>` with underline focus style)
- **Remove the Edit button** from the toolbar — replaced by click-to-edit

### Edit mode

- Content becomes a full-height `<textarea>` with monospace font, no resize
- A thin markdown hint bar above the textarea: `**tučné**  *kurzíva*  # Nadpis  - zoznam  \`kód\`` — read-only labels, not buttons
- **Escape key** → auto-save + back to view mode
- **Click outside** (blur on textarea) → auto-save + back to view mode
- Title input: same — blur → auto-save
- Auto-save calls the existing `onSave(note.id, title, content)` prop

### Edit button

Removed from the toolbar. The delete button and course badge remain. The toolbar simplifies to: `[title] [🗑]`.

---

## Affected Files

| File | Change |
|---|---|
| `apps/frontend/src/routes/courses/$courseId.tsx` | Add `+` button + inline form in Notes tab |
| `apps/frontend/src/components/notes/note-detail-view.tsx` | Click-to-edit, MD render, course badge+dropdown, remove Edit button |
| `apps/frontend/package.json` | Add `react-markdown` |

---

## Out of Scope

- Markdown toolbar (bold/italic buttons) — hints only, no formatting buttons
- Syncing course from `/notes` create dialog — that's Option B, not selected
- Full-screen editor mode
- Note search or filter by course on `/notes` page
