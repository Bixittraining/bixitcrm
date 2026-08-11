-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Strengthens follow_ups so Lead List, Lead Detail, and the Follow-up module
-- can share exactly one record shape instead of each guessing at fields.
-- Purely additive — every existing row keeps its id/lead/type/date/time/
-- notes/status/priority exactly as-is; new columns default to NULL for
-- rows that predate this migration.

alter table public.follow_ups add column if not exists lead_id bigint references public.leads(id) on delete cascade;
alter table public.follow_ups add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
alter table public.follow_ups add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.follow_ups add column if not exists completed_by uuid references public.profiles(id) on delete set null;
alter table public.follow_ups add column if not exists completed_at timestamptz;

-- Cancel is now a real terminal status alongside pending/completed — a
-- cancelled follow-up stays on record (never deleted), just closed out
-- without being marked "completed" (which would misrepresent it as done).
alter table public.follow_ups drop constraint if exists follow_ups_status_check;
alter table public.follow_ups add constraint follow_ups_status_check
  check (status in ('pending', 'completed', 'cancelled'));

-- One-time backfill: link every existing row to its lead by the name match
-- that's always been used at the application layer, wherever that lead
-- still exists. Only fills NULLs — never overwrites anything.
update public.follow_ups f
set lead_id = l.id
from public.leads l
where f.lead = l.name and f.lead_id is null;

create index if not exists follow_ups_lead_id_idx on public.follow_ups (lead_id);
