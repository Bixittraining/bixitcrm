-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Backs the batch roster's certificate tracking: once a student's course
-- is marked "completed", admins can mark whether they've actually
-- collected their certificate yet.

alter table public.students
  add column if not exists certificate_collected boolean not null default false,
  add column if not exists certificate_collected_date date;
