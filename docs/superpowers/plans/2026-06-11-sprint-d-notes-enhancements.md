# Sprint D — Notes Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three linked improvements to Notes: (1) link notes to courses from course detail + from note view, (2) click-to-edit note content without an Edit button, (3) markdown rendering in view mode.

**Architecture:** No backend changes — `PATCH /notes/:id` already accepts `courseId`. Frontend only. `NoteDetailView` gains click-to-edit, ReactMarkdown rendering, and an inline course badge+dropdown. The course detail Notes tab gains a `+` button with inline form that posts `courseId` directly. `react-markdown` is installed as new dependency.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, TanStack Query, `react-markdown` (new)

---

## File Map

| File | Change |
|---|---|
| `apps/frontend/src/types/index.ts` | Add `courseId` to `Note` interface |
| `apps/frontend/package.json` | Add `react-markdown` dependency |
| `apps/frontend/src/components/notes/note-detail-view.tsx` | Click-to-edit, MD render, course badge, remove Edit button |
| `apps/frontend/src/routes/courses/$courseId.tsx` | + button + inline form in Notes tab |

---

## Task 1: Add `courseId` to `Note` type + install `react-markdown`

**Files:**
- Modify: `apps/frontend/src/types/index.ts`

- [ ] **Step 1: Add `courseId` to `Note` interface**

In `apps/frontend/src/types/index.ts`, replace the `Note` interface:

```typescript
export interface Note {
  id: number;
  userId: number;
  title: string;
  description: string;
  folderId?: number | null;
  courseId?: number | null;
  deletedAt: string | null;
}
```

- [ ] **Step 2: Install react-markdown**

```bash
pnpm --filter @pb138/frontend add react-markdown
```

Expected: `react-markdown` added to `apps/frontend/package.json` dependencies.

- [ ] **Step 3: TypeScript check**

```bash
cd apps/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors (the `courseId` field was already used in `$courseId.tsx` via a local `CourseNote` interface — adding it to the shared type resolves any implicit `any`).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/types/index.ts apps/frontend/package.json pnpm-lock.yaml
git commit -m "feat: add courseId to Note type, install react-markdown"
```

---

## Task 2: NoteDetailView — click-to-edit + auto-save

**Files:**
- Modify: `apps/frontend/src/components/notes/note-detail-view.tsx`

The goal: remove the Edit button, let the user click anywhere on the note text to enter edit mode. Escape or click-outside auto-saves and returns to view mode.

- [ ] **Step 1: Read the current file**

Read `apps/frontend/src/components/notes/note-detail-view.tsx` to confirm current state before editing.

- [ ] **Step 2: Replace the component with click-to-edit version**

Replace the entire file with:

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, BrainCircuit, Sparkles } from 'lucide-react';
import { NoteModel } from '@/types/index';
import { Button } from '@/components/ui/button';
import DeleteNoteDialog from '@/components/notes/delete-note-dialog';
import { useTranslation } from 'react-i18next';
import { QuizModal } from '@/components/notes/QuizModal';
import { NoteAIChat } from '@/components/notes/NoteAIChat';
import { getReadingStats } from '@/lib/note-utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Course {
  id: number;
  code: string;
  name: string | null;
}

interface NoteDetailViewProps {
  note: NoteModel;
  autoEdit?: boolean;
  onSave: (id: number, title: string, description: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function NoteDetailView({
  note,
  autoEdit,
  onSave,
  onDelete,
}: NoteDetailViewProps) {
  const [isEditing, setIsEditing] = useState(autoEdit || false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { words, minutes } = getReadingStats(content);

  // Close dropdown on outside click
  useEffect(() => {
    if (!courseDropdownOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCourseDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [courseDropdownOpen]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.get<Course[]>('/courses').catch(() => []),
  });

  const currentCourse = courses.find((c) => c.id === note.courseId);

  const handleAutoSave = useCallback(async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      await onSave(note.id, title.trim(), content);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [note.id, title, content, onSave]);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete(note.id);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  }

  async function handleLinkCourse(courseId: number | null) {
    await api.patch(`/notes/${note.id}`, { courseId });
    queryClient.setQueryData<NoteModel[]>(['notes'], (prev = []) =>
      prev.map((n) => (n.id === note.id ? { ...n, courseId } : n))
    );
    setCourseDropdownOpen(false);
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleAutoSave();
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex flex-col min-h-[50vh] h-full transition-colors">
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3 border-b dark:border-gray-700 pb-3 gap-4">
        {isEditing ? (
          <input
            className="text-xl font-bold flex-1 border dark:border-gray-600 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('dialog.noteTitle')}
            onBlur={handleAutoSave}
          />
        ) : (
          <h2
            className="text-xl font-bold truncate flex-1 text-gray-900 dark:text-white cursor-text"
            onClick={() => setIsEditing(true)}
          >
            {note.title}
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
          onClick={() => setIsDeleteDialogOpen(true)}
          disabled={isDeleting}
        >
          <Trash2 size={18} />
        </Button>
      </div>

      {/* Stats + course badge + AI buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {words} slov · ~{minutes} min čítania
          {isSaving && <span className="ml-2 text-indigo-400">{t('notes.saving')}</span>}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Course badge */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setCourseDropdownOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                currentCourse
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700'
                  : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
            >
              <span>📚</span>
              <span>{currentCourse ? currentCourse.code : '+ Kurz'}</span>
              {currentCourse && <span className="text-gray-400">▾</span>}
            </button>
            {courseDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b dark:border-gray-700">
                  Priradiť ku kurzu
                </div>
                {courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleLinkCourse(c.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      note.courseId === c.id ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {note.courseId === c.id && <span>✓</span>}
                    {note.courseId !== c.id && <span className="w-4" />}
                    {c.code}{c.name ? ` — ${c.name}` : ''}
                  </button>
                ))}
                <button
                  onClick={() => handleLinkCourse(null)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-t dark:border-gray-700 transition-colors"
                >
                  — Bez kurzu
                </button>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 dark:border-gray-600 dark:text-gray-300"
            onClick={() => setQuizOpen(true)}
            disabled={words < 20}
          >
            <BrainCircuit size={14} />
            Quiz me
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 dark:border-gray-600 dark:text-gray-300"
            onClick={() => setAiChatOpen(true)}
            disabled={words < 5}
          >
            <Sparkles size={14} />
            Ask AI
          </Button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <>
          {/* Markdown hint bar */}
          <div className="flex gap-3 px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-t-lg border border-b-0 border-gray-200 dark:border-gray-600 text-xs text-gray-400 font-mono overflow-x-auto whitespace-nowrap">
            <span>**tučné**</span>
            <span>*kurzíva*</span>
            <span># Nadpis</span>
            <span>- zoznam</span>
            <span>`kód`</span>
            <span className="ml-auto text-indigo-400 font-sans font-medium">Esc = uložiť</span>
          </div>
          <textarea
            ref={textareaRef}
            className="flex-1 w-full p-3 border dark:border-gray-600 rounded-b-lg resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleAutoSave}
            onKeyDown={handleTextareaKeyDown}
            placeholder={t('notes.startWriting')}
          />
        </>
      ) : (
        <div
          className="flex-1 cursor-text rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors p-2 -mx-2"
          onClick={() => setIsEditing(true)}
          title="Klikni pre editáciu"
        >
          {content ? (
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {content}
            </p>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 italic text-sm">{t('notes.empty')}</p>
          )}
        </div>
      )}

      <DeleteNoteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <QuizModal
        noteId={note.id}
        noteTitle={note.title}
        isOpen={quizOpen}
        onClose={() => setQuizOpen(false)}
      />

      <NoteAIChat
        noteId={note.id}
        noteTitle={note.title}
        isOpen={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
      />
    </div>
  );
}
```

Note: markdown rendering is NOT included yet (added in Task 3). The view mode uses plain `whitespace-pre-wrap` for now.

- [ ] **Step 3: TypeScript check**

```bash
cd apps/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/notes/note-detail-view.tsx
git commit -m "feat: click-to-edit notes, auto-save on blur/Escape, course badge"
```

---

## Task 3: NoteDetailView — ReactMarkdown rendering

**Files:**
- Modify: `apps/frontend/src/components/notes/note-detail-view.tsx`

- [ ] **Step 1: Add ReactMarkdown import**

Add to the imports at the top of `note-detail-view.tsx`:

```tsx
import ReactMarkdown from 'react-markdown';
```

- [ ] **Step 2: Replace plain-text view with ReactMarkdown**

In the view mode section (inside `{isEditing ? ... : ...}`), replace the plain text render:

```tsx
{content ? (
  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
    {content}
  </p>
) : (
  <p className="text-gray-400 dark:text-gray-500 italic text-sm">{t('notes.empty')}</p>
)}
```

With:

```tsx
{content ? (
  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed
    prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
    prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:rounded prose-code:px-1 prose-code:text-sm
    prose-pre:bg-gray-100 dark:prose-pre:bg-gray-700 prose-pre:rounded-lg prose-pre:p-3
    prose-ul:pl-4 prose-ol:pl-4">
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
) : (
  <p className="text-gray-400 dark:text-gray-500 italic text-sm">{t('notes.empty')}</p>
)}
```

- [ ] **Step 3: Install Tailwind typography plugin (required for `prose` classes)**

Check if `@tailwindcss/typography` is installed:

```bash
grep "typography" apps/frontend/package.json
```

If not found, install it:

```bash
pnpm --filter @pb138/frontend add -D @tailwindcss/typography
```

Then add to `apps/frontend/tailwind.config.js` plugins array:

```js
plugins: [require('@tailwindcss/typography')],
```

- [ ] **Step 4: TypeScript check**

```bash
cd apps/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/notes/note-detail-view.tsx apps/frontend/tailwind.config.js apps/frontend/package.json pnpm-lock.yaml
git commit -m "feat: markdown rendering in note view with react-markdown"
```

---

## Task 4: Course detail Notes tab — `+` button + inline form

**Files:**
- Modify: `apps/frontend/src/routes/courses/$courseId.tsx`

- [ ] **Step 1: Add state for new note inline form**

Inside `CourseDetailPage`, after the existing `saving` state (around line 73), add:

```typescript
const [showNewNote, setShowNewNote] = useState(false);
const [newNoteTitle, setNewNoteTitle] = useState('');
const [savingNote, setSavingNote] = useState(false);
```

- [ ] **Step 2: Add `handleCreateNote` function**

After the existing `createTask` function (around line 289), add:

```typescript
async function handleCreateNote() {
  if (!newNoteTitle.trim()) return;
  setSavingNote(true);
  try {
    await api.post('/notes', {
      title: newNoteTitle.trim(),
      description: '',
      courseId: Number(courseId),
    });
    queryClient.invalidateQueries({ queryKey: ['notes'] });
    setNewNoteTitle('');
    setShowNewNote(false);
  } finally {
    setSavingNote(false);
  }
}
```

- [ ] **Step 3: Update the Notes tab JSX**

Find the Notes tab section (starts at `{!isTeacher && activeTab === 'notes' && (`). Replace the header div and list with:

```tsx
{!isTeacher && activeTab === 'notes' && (
  <div className="px-4 mt-6">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-yellow-500" />
        <span className="font-semibold text-gray-900 dark:text-white">Notes</span>
        <span className="text-gray-400 text-sm">{notes.length}</span>
      </div>
      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowNewNote(true)}>
        <Plus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </Button>
    </div>

    {notes.length === 0 && !showNewNote && (
      <p className="text-sm text-gray-400 py-4 text-center">No notes for this course</p>
    )}

    {notes.length > 0 && (
      <div className="space-y-2 mb-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white">{note.title}</p>
          </div>
        ))}
      </div>
    )}

    {showNewNote && (
      <div className="border border-dashed border-indigo-300 dark:border-indigo-700 rounded-2xl p-4 bg-indigo-50/50 dark:bg-indigo-900/10">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">Nová note</p>
        <input
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-3"
          placeholder="Názov note..."
          value={newNoteTitle}
          onChange={(e) => setNewNoteTitle(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreateNote();
            if (e.key === 'Escape') { setShowNewNote(false); setNewNoteTitle(''); }
          }}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => { setShowNewNote(false); setNewNoteTitle(''); }}>
            Zrušiť
          </Button>
          <Button
            size="sm"
            onClick={handleCreateNote}
            disabled={savingNote || !newNoteTitle.trim()}
          >
            {savingNote ? 'Ukladám…' : 'Vytvoriť'}
          </Button>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: TypeScript check**

```bash
cd apps/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/routes/courses/'$courseId.tsx'
git commit -m "feat: add note creation from course detail Notes tab"
```

---

## Self-Review

**Spec coverage:**
- ✅ Feature 1 (create note from course detail) — Task 4
- ✅ Feature 2 (link/unlink note to course via badge) — Task 2 (course badge+dropdown with `handleLinkCourse`)
- ✅ Feature 3 (click-to-edit) — Task 2
- ✅ Feature 3 (auto-save on Escape/blur) — Task 2
- ✅ Feature 3 (markdown rendering) — Task 3
- ✅ Feature 3 (remove Edit button) — Task 2 (Edit button not included in rewritten component)
- ✅ `react-markdown` install — Task 1

**Type consistency:**
- `NoteModel` gains `courseId?: number | null` in Task 1 → used in `note-detail-view.tsx` Tasks 2–3 via `note.courseId`
- `handleLinkCourse(courseId: number | null)` defined and used consistently
- `Course` interface in `note-detail-view.tsx`: `{ id, code, name }` — matches what `GET /courses` returns

**Placeholder scan:** None found — all code blocks complete.

**Note on `@tailwindcss/typography`:** Task 3 Step 3 checks whether it's installed before installing. If it's already present, skip the install and just add it to `tailwind.config.js` plugins.
