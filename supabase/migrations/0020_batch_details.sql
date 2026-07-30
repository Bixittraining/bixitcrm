-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Batches had a start date but no end date, no assigned instructor, and the
-- schedule was a single free-text box ("type it yourself"). Adds real
-- structured fields: an instructor (linked to an actual team member, not
-- just typed text), an end date, and a proper day-of-week + time-range
-- schedule instead of manual typing.

alter table public.batches
  add column if not exists instructor_id uuid references public.profiles(id) on delete set null,
  add column if not exists end_date date,
  add column if not exists schedule_days text[] not null default '{}',
  add column if not exists start_time time,
  add column if not exists end_time time;
