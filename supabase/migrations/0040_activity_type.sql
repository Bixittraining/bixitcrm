-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Adds a structured type to each timeline entry (Call, Status Changed, Fee
-- Bill Created, etc.) so the Lead Timeline can show the right icon and be
-- filtered reliably, instead of guessing from free-text descriptions.
-- Purely additive — existing rows get NULL (shown as a generic entry,
-- visible under "All" but not misclassified into a specific filter).

alter table public.lead_activities add column if not exists activity_type text;
create index if not exists lead_activities_type_idx on public.lead_activities (activity_type);
