-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Students were linked to batches purely by matching the batch NAME string
-- (students.batch = batches.name). That breaks the moment a batch is
-- renamed (every student silently orphaned, count goes to 0/capacity) and
-- is why most existing students (seeded with old random "Batch 2026-A/B/C"
-- names before the Batches feature existed) don't match any real batch
-- today. Adds a real foreign key; students.batch (text) stays as a
-- fallback/display cache but batch_id is now the source of truth.

alter table public.students
  add column if not exists batch_id bigint references public.batches(id) on delete set null;

create index if not exists students_batch_id_idx on public.students (batch_id);
