-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- The Lead profile's "Notes" tab was never actually persisted — it only
-- lived in local React state (initialized with a fake "System: Initial
-- inquiry..." note), so anything typed there vanished on refresh. This adds
-- a real table for it, plus the same for Students (new — students had no
-- notes at all), so instructors/admins can record real, permanent notes
-- like "how to teach this student" / progress observations.

create table if not exists public.lead_notes (
  id bigint generated always as identity primary key,
  lead_id bigint not null references public.leads(id) on delete cascade,
  text text not null,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  created_at timestamptz not null default now()
);

alter table public.lead_notes enable row level security;

drop policy if exists "lead_notes_all_authenticated" on public.lead_notes;
create policy "lead_notes_all_authenticated"
  on public.lead_notes for all
  to authenticated
  using (true)
  with check (true);

create index if not exists lead_notes_lead_idx on public.lead_notes (lead_id);

create table if not exists public.student_notes (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  text text not null,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  created_at timestamptz not null default now()
);

alter table public.student_notes enable row level security;

drop policy if exists "student_notes_all_authenticated" on public.student_notes;
create policy "student_notes_all_authenticated"
  on public.student_notes for all
  to authenticated
  using (true)
  with check (true);

create index if not exists student_notes_student_idx on public.student_notes (student_id);
