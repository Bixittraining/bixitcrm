-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Replaces the free-text-per-student "progress module" architecture from
-- 0045 with a real Course -> Module -> Student Progress system:
--
--   packages (course)  ──┐
--                        ▼
--             course_modules (master module list, one row per course
--             module — HTML & CSS / JavaScript / React / ... — defined
--             ONCE per course, never re-typed per student)
--                        │
--                        ▼
--             student_module_progress (one row per student per module —
--             the STUDENT INSTANCE of that master module: status/percent/
--             timestamps. Editing a student's row never touches the
--             master module, and vice versa.)
--
-- student_progress_modules (the old free-text table from 0045) is dropped
-- here — it holds zero rows in production (confirmed via direct query
-- before writing this migration), so this is a clean architecture
-- replacement, not a data-loss risk.

drop table if exists public.student_progress_modules;

-- ── COURSE MODULE MASTER ─────────────────────────────────────────────
-- Defined once per course (package), inherited by every student enrolled
-- in that course. Admin manages this from Packages -> a course's Modules
-- section, never from an individual student's profile.
create table if not exists public.course_modules (
  id bigint generated always as identity primary key,
  package_id bigint not null references public.packages(id) on delete cascade,
  name text not null,
  description text,
  position int not null default 0,
  estimated_duration text,
  is_active boolean not null default true,
  learning_objectives text,
  trainer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.course_modules enable row level security;
drop policy if exists "course_modules_all_authenticated" on public.course_modules;
create policy "course_modules_all_authenticated" on public.course_modules
  for all to authenticated using (true) with check (true);
create index if not exists course_modules_package_idx on public.course_modules (package_id, position);

comment on table public.course_modules is 'Master module definitions per course (package). The single source of truth for what modules a course has — student_module_progress rows reference these by ID, never by re-typed name.';
comment on column public.course_modules.is_active is 'Archived (false) modules are hidden from new initialization but historical student_module_progress rows referencing them are preserved, never deleted.';

-- ── STUDENT MODULE PROGRESS (the student instance) ──────────────────
-- One row per (student, module) — enforced by the unique constraint below,
-- which is also what makes "initialize progress" idempotent: re-running it
-- for a student who already has some rows only inserts the missing ones.
create table if not exists public.student_module_progress (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  module_id bigint not null references public.course_modules(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'on_hold')),
  percent int not null default 0 check (percent >= 0 and percent <= 100),
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, module_id)
);
alter table public.student_module_progress enable row level security;
drop policy if exists "student_module_progress_all_authenticated" on public.student_module_progress;
create policy "student_module_progress_all_authenticated" on public.student_module_progress
  for all to authenticated using (true) with check (true);
create index if not exists student_module_progress_student_idx on public.student_module_progress (student_id);
create index if not exists student_module_progress_module_idx on public.student_module_progress (module_id);

comment on table public.student_module_progress is 'A students progress against one course_modules row. Which "course" this represents is derived by joining module_id -> course_modules.package_id, not stored redundantly here — this is what lets a students progress on an OLD course survive a course change untouched (its rows just point at the old courses modules) while a NEW set of rows gets initialized for the new course.';
