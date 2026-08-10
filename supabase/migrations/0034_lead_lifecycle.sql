-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Widens leads.status to support the new lifecycle stages. Purely
-- additive — every value already in use today (new, contacted, qualified,
-- negotiation, enrolled, lost) stays exactly as it was; nothing is
-- renamed, nothing is deleted, no existing row is touched.
--
-- Live data checked before writing this migration: 27 leads currently
-- use only new/contacted/qualified/enrolled/lost (negotiation is a valid
-- value already but unused right now) — every one of them is already
-- valid under the new constraint with no mapping needed.

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new', 'contacted', 'qualified', 'counselling', 'package_shared', 'follow_up', 'negotiation', 'enrolled', 'lost', 'nurture'));
