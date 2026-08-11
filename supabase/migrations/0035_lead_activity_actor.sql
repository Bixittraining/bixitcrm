-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Purely additive — adds who-did-it to the lead activity timeline. Existing
-- rows just get NULL actor columns (unattributed history from before this
-- migration); nothing existing is renamed, deleted, or backfilled.

alter table public.lead_activities add column if not exists actor_id uuid references public.profiles(id) on delete set null;
alter table public.lead_activities add column if not exists actor_name text;
