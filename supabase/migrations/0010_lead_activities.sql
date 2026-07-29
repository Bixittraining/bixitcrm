-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Backs a real per-lead activity/timeline log: every status change, follow-up
-- action, RNR, and note gets one row here so the Lead profile can show a true
-- chronological history instead of a derived/guessed timeline.

create table if not exists public.lead_activities (
  id bigint generated always as identity primary key,
  lead_id bigint not null references public.leads(id) on delete cascade,
  from_status text,
  to_status text,
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.lead_activities enable row level security;

drop policy if exists "lead_activities_all_authenticated" on public.lead_activities;
create policy "lead_activities_all_authenticated"
  on public.lead_activities for all
  to authenticated
  using (true)
  with check (true);

create index if not exists lead_activities_lead_created_idx
  on public.lead_activities (lead_id, created_at desc);
