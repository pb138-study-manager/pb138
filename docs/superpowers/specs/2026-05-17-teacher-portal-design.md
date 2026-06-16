# Teacher Portal — Design Spec

**Date:** 2026-05-17  
**Branch:** merge-be-fe  
**Status:** ⚠️ PLACEHOLDER — teacher portal pages (`/teachers/*`) existujú ako UI shell. Obsah nie je implementovaný a ostáva ako placeholder pre budúci vývoj (mimo scope aktuálneho PR).  
**Scope:** Teacher view inside course detail + global design polish

---

## Summary

Teacher portal is built by reusing the existing `/courses/$courseId.tsx` component. When `mode === 'teacher'` (from `useRoleMode()`), the course detail renders teacher-specific tabs instead of student tabs. The student view is untouched.

Teacher navigates: **My Classes (`/teachers/`)** → course card → **`/courses/:id`** (teacher view).

The separate `/teachers/assignments`, `/teachers/materials`, `/teachers/students` shell pages are removed — their content lives inside the course detail.

---

## Course Detail — Role-Aware Tabs

### Student mode (unchanged)

Tabs: **Tasks | Notes | Materials**
Behaviour: exactly as currently implemented.

### Teacher mode (new)

Tabs: **Assignments | Materials | Students**

---

## Teacher Tab: Assignments

**UI:**

- Header row: "Assignments" label + count + `+` ghost button
- List of assignment cards (same `rounded-2xl shadow-md` style):
  - Icon (📝, colored background per course color)
  - Title, due date
  - Badge: `{done}/{total} done` — counts how many enrolled students have toggled the task done
  - `›` chevron (future: tap to see per-student breakdown)
- Empty state: centered icon + "No assignments yet"
- `+` opens a bottom-sheet modal: title, description (optional), due date → calls `POST /courses/:id/assignments`

**Backend needed:**

- `GET /courses/:id/assignments` — list assignments for a course with done/total counts
  - Join `assignments` → `tasks` → count done per assignment

---

## Teacher Tab: Materials

**UI:**

- Header row: "Study Materials" label + count + `+` ghost button
- List of material cards:
  - Icon: 📄 (PDF), 🔗 (link), 📊 (slides) — based on `type` field or URL extension
  - Title, type label + upload date
  - Trash icon on right → `DELETE /courses/:id/materials/:id`
- `+` opens a bottom-sheet modal: title, URL (optional), description (optional) → calls `POST /courses/:id/materials`

**Backend:** `GET/POST/DELETE /courses/:id/materials` — already implemented ✅

---

## Teacher Tab: Students

**UI:**

- Filter pills: course filter not needed (already in one course context)
- List of student cards:
  - Initials avatar (colored)
  - Name, email
  - Badge: `{done}/{total} done` — tasks done out of total assigned tasks in this course
  - Color coding: green ≥80%, yellow 40–79%, red <40%
- Empty state: "No students enrolled"
- No add button (enroll happens from student side)

**Backend needed:**

- `GET /courses/:id/students` — list enrolled students with per-student task completion
  - Join `user_courses` → `users` → `user_profiles` → `tasks` (filtered by courseId + assignmentId not null)

---

## Global Design Polish

Apply to **`/courses/index.tsx`** and **`/courses/$courseId.tsx`**:

| Element            | Current                             | New                                                        |
| ------------------ | ----------------------------------- | ---------------------------------------------------------- |
| Card shadow        | `shadow-sm`                         | `shadow-md` (or equivalent: `0 4px 14px rgba(0,0,0,0.10)`) |
| Active tab         | `border-indigo-500 text-indigo-600` | `border-gray-800 text-gray-900`                            |
| Active filter pill | `bg-indigo-600 text-white`          | `bg-gray-800 text-white`                                   |

These changes apply to both student and teacher views of courses. All other pages stay unchanged.

---

## Teacher Sidebar Nav

Since all teacher content lives inside the course detail, the teacher nav is reduced to the minimum:

```
TEACHER  ⇄
─────────────────
🏫  My Classes     (/teachers/)
─────────────────
👤  Profile        (/profile)
```

Assignments, Materials, Students are not top-level nav items — they are tabs inside a course.

---

## What Changes

### Modified files

- `apps/frontend/src/routes/courses/$courseId.tsx` — role-aware tabs + teacher tab content
- `apps/frontend/src/routes/courses/index.tsx` — bigger card shadows
- `apps/frontend/src/components/ui/sidebar.tsx` — teacher nav reduced to My Classes + Profile
- `apps/frontend/src/components/ui/bottom-nav.tsx` — teacher bottom nav same reduction

### New backend routes (add to `courses.ts`)

- `GET /courses/:id/assignments` — assignments list with done/total counts
- `GET /courses/:id/students` — enrolled students with per-student task completion

### Deleted

- `apps/frontend/src/routes/teachers/assignments.tsx`
- `apps/frontend/src/routes/teachers/materials.tsx`
- `apps/frontend/src/routes/teachers/students.tsx`

---

## What Does NOT Change

- `/teachers/` (My Classes) — stays, links to `/courses/:id`
- Student course view (Tasks / Notes / Materials tabs) — untouched
- All other pages (Today, Tasks, Notes, Timeline, Profile) — untouched
- Auth, routing, roleMode — untouched
