-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Real batch management: previously a student's "batch" was just a random
-- letter (Batch 2026-A/B/C/D) picked with Math.random() on enrollment, with
-- no actual schedule, capacity, or course tied to it. This table backs a
-- proper Batches page where batches are created per course with a real
-- start date, schedule, and capacity, and students get assigned into one.

create table if not exists public.batches (
  id bigint generated always as identity primary key,
  name text not null,
  course text not null,
  start_date date,
  schedule text,
  capacity int not null default 30,
  status text not null default 'upcoming' check (status in ('upcoming', 'ongoing', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.batches enable row level security;

drop policy if exists "batches_all_authenticated" on public.batches;
create policy "batches_all_authenticated"
  on public.batches for all
  to authenticated
  using (true)
  with check (true);
