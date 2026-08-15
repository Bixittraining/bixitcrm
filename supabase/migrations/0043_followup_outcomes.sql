-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Adds a structured outcome to each follow-up, so "what happened on this
-- call/WhatsApp/etc." is a real, queryable field instead of being encoded
-- into free-text notes (the old RNR flow prefixed notes with "Ring No
-- Response (RNR)." and matched on that string — fragile, and impossible
-- to build the Outcome -> Next Action workflow on top of).
--
-- Purely additive: existing rows get NULL (no outcome recorded — they
-- predate this feature), nothing existing is renamed, retyped, or deleted.
-- follow_ups.notes, .status, .type, .date, .time, .assigned_to, and every
-- other existing column are untouched.

alter table public.follow_ups add column if not exists outcome text;

create index if not exists follow_ups_outcome_idx on public.follow_ups (outcome);

comment on column public.follow_ups.outcome is
  'One of src/lib/followUpOutcomes.js''s OUTCOMES keys (connected, rnr, interested, needs_more_time, requested_callback, package_shared, payment_discussion, ready_to_enroll, not_interested, other). Null for follow-ups completed before this existed, or never completed.';
