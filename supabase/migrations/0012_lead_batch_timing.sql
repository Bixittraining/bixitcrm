-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- The Requirement tab's "Preferred Batch Timing" was previously just
-- guessing from keywords in the notes text and wasn't actually selectable.
-- This adds a real column so it can be picked and persisted.

alter table public.leads
  add column if not exists batch_timing text check (batch_timing in ('Morning', 'Afternoon', 'Evening', 'Weekend'));
