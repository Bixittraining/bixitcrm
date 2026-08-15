-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Fixes the critical Follow-up completion bug: 0043 (which added
-- follow_ups.outcome) was written but never actually applied to this
-- database, so every "Complete Follow-up" write since then has been
-- silently failing with `column follow_ups.outcome does not exist` —
-- the DataContext write threw, was swallowed by a bare console.error,
-- and the caller never checked the result before reporting success, so
-- the UI showed "Follow-up completed" while the row stayed `status =
-- 'pending'` and kept reappearing under Overdue.
--
-- This migration:
--   1. Re-asserts the (still-missing) follow_ups.outcome column.
--   2. Adds the completion/cancellation audit trail spec section 3/23
--      asks for — completion_note (kept separate from the original
--      scheduling `notes`, which is left untouched on completion now),
--      cancelled_at, cancelled_by, cancellation_reason.
--   3. Adds a real server-side guard: an update can only ever move a
--      follow-up OUT of 'pending' once. Modeled as a Postgres function +
--      trigger rather than trusting every call site to remember to add
--      `.eq('status', 'pending')` — the database itself now refuses a
--      second completion/cancellation, which is what "server-side
--      validation, not just a disabled button" means in practice.
--
-- Purely additive — no existing row, status, or column is renamed,
-- retyped, or deleted.

alter table public.follow_ups add column if not exists outcome text;
alter table public.follow_ups add column if not exists completion_note text;
alter table public.follow_ups add column if not exists cancelled_at timestamptz;
alter table public.follow_ups add column if not exists cancelled_by uuid references public.profiles(id) on delete set null;
alter table public.follow_ups add column if not exists cancellation_reason text;

create index if not exists follow_ups_outcome_idx on public.follow_ups (outcome);

comment on column public.follow_ups.outcome is
  'One of src/lib/followUpOutcomes.js''s OUTCOMES keys for call/whatsapp/package/payment/document/general follow-ups, or the raw meeting-outcome label for counselling sessions. Null for follow-ups completed before this existed, or never completed.';
comment on column public.follow_ups.completion_note is
  'Optional note entered in the Complete Follow-up dialog — kept separate from `notes` (the original scheduling note), so completing a follow-up never overwrites why it was booked.';
comment on column public.follow_ups.cancellation_reason is
  'Optional free-text reason entered when cancelling — no fixed list, unlike leads.closure_reason.';

-- A second attempt to complete/cancel an already-completed/cancelled
-- follow-up is rejected by Postgres itself, not just skipped by a
-- `.eq('status','pending')` clause the client might forget to add —
-- belt-and-suspenders for the DataContext-level guard.
create or replace function public.guard_followup_status_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('completed', 'cancelled') and new.status is distinct from old.status then
    raise exception 'follow_up_already_closed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_followup_status_transition on public.follow_ups;
create trigger guard_followup_status_transition
  before update on public.follow_ups
  for each row
  execute function public.guard_followup_status_transition();
