# Major Update Plan — Cloud, Students, Smart Ask Question

This is a large multi-part feature. I'll implement it in phases, each independently testable. Before I start, a few decisions to confirm.

## Questions before I build

1. **Auth model for teachers**: The spec says "each teacher sees only their data" and "remember the teacher on the device". Do you want:
   - **(A) No login** — device picks a teacher (stored in localStorage). Any teacher on that device can record marks. Simple. All cloud data is shared/readable.
   - **(B) Teacher login** — each teacher signs in (email/password). Cloud enforces "only your own records". More secure but adds friction (you'd need to hand out logins).
   
   I recommend **(A) for now** with a `teacherCode` stored per-device — matches "remember teacher on this device" and keeps it fast. We can add real logins later without changing the schema.

2. **Student extraction from PDF**: I'll parse `class wise full.pdf` and hard-code the extracted `{name, admissionNo, class}` list into a seed migration. Any name spelling issues you can fix later in the DB. OK?

## Phase 1 — Enable Cloud Backend

- Enable Lovable Cloud (Supabase under the hood).
- Create tables (all in `public`, with GRANTs + RLS):
  - `students` — id, admission_no, name, class_id (S1..S7)
  - `evaluations` — id, student_id, teacher_code, class_id, subject, day, period, mark (nullable), status (`answered`|`not_answered`|`absent`), created_at
  - `round_picks` — id, teacher_code, class_id, subject, student_id, round_no, picked_at (used to track "each student once per round")
  - `settings` — key/value for future use
- RLS Phase 1: since we're going with no-login (Option A), tables get `TO anon` SELECT + INSERT policies. Reads are public, writes are append-only from the app. (When we add teacher login later, we tighten these.)
- Timetable stays in `src/data/timetable.ts` — it's static, PDF-driven, no reason to move to DB.

## Phase 2 — Student Data

- Extract all S1–S7 students from `class wise full.pdf` via `document--parse_document`.
- Seed via a SQL migration inserting all students.
- Add `src/lib/students.ts` — server functions or direct browser-client queries:
  - `listStudents(classId?, search?, sort?)`
  - `getStudentStats(studentId)` — aggregates from `evaluations`

## Phase 3 — Students section on Class page

Add below the existing schedule on `/classes/$id`:
- Search box, sort dropdown (name / performance / attendance)
- Grid of rounded rectangle cards showing: name, admission #, class, performance score (avg mark), attendance count (answered+not_answered), Qs answered, Qs not answered, times absent, rank (within class).
- Live from cloud.

## Phase 4 — Smart "Ask Question" card

On `/teachers/$code`, directly under **Teaching Now**:
- Reads current day+period → looks up teacher's slot in `SCHEDULE` → gets `{class, subject}`.
- If no current slot, card shows "Not currently teaching" with next slot preview.
- Big **Ask Question** button:
  - Picks a random student from that class who hasn't been picked in the current round for `(teacher, class, subject)`.
  - Inserts a `round_picks` row.
  - Navigates to `/classes/{classId}?highlight={studentId}` — target student gets an animated ring.
  - Also renders the selected student inline in the Ask Question card with three actions:
    - **Answered** → opens mark dialog (0–10 buttons) → inserts `evaluations` row with `status='answered'` + mark.
    - **Not Answered** → inserts `status='not_answered'`, mark=-1.
    - **Absent** → inserts `status='absent'`.
- Round completion: when all students in the class have been picked for this `(teacher, subject)` round, show **Round Completed** + **Start New Round** button (increments round_no; history preserved).

## Phase 5 — Analytics & Rankings

- Student profile page `/students/$id`: overall score, per-subject breakdown (avg / high / low / count), answered/not-answered/absent counts, percentage, current round status per subject.
- Rankings page `/rankings`: tabs for Class / Subject / Teacher / College with Top 10 / 20 / All.
- All computed with SQL views or client-side aggregation from `evaluations`.

## Phase 6 — Personal teacher landing

- On first visit to `/teachers/$code`, save `preferredTeacher` to localStorage.
- Root route (`/`): if `preferredTeacher` is set, redirect to that teacher's page. Otherwise show Overall Timetable as today.
- On the teacher page, add "Return to Overall Timetable" button.
- Add `/settings` (or a settings sheet) with "Switch Teacher" (clear or change preferred teacher).

## Technical Details (for reference)

- **Stack**: TanStack Start + Supabase (via Lovable Cloud). Browser Supabase client for reads and inserts (no server functions needed for Phase 1 since RLS handles auth).
- **Realtime sync**: enable Supabase Realtime on `evaluations` and `round_picks` so multi-device views update instantly via `postgres_changes` subscriptions on the class/teacher pages.
- **Migrations**: one migration for schema + GRANTs + RLS + realtime publication; one migration for student seed data.
- **Round tracking query**: `SELECT student_id FROM round_picks WHERE teacher_code=$1 AND class_id=$2 AND subject=$3 AND round_no=$4` — pick a random student from `students WHERE class_id=$2` MINUS that set.
- **Colors / timetable data**: untouched. All existing PDF colors preserved.

## Scope note

This plan intentionally does **not** cover: teacher/student/parent logins, exam marks, semester analysis, Excel/PDF export, multi-college — the schema is designed to accommodate them later without restructuring, per your "future ready" requirement.

**Please answer the two questions at the top (auth model + student seed approach) and I'll start with Phase 1.**
