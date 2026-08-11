-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Extends the automation_events/automation_logs foundation (0032) from
-- Attendance-only to the full Lead lifecycle, ahead of the upcoming
-- WhatsApp + Email Automation phase. No message-sending is added here —
-- this only:
--   1. adds a `rule` column so a log entry can record which conditional
--      rule (not just which action) produced it — see AUTOMATION_RULES in
--      src/lib/automation.js for the EVENT -> RULE -> CONDITIONS -> ACTIONS
--      shape this supports.
--   2. widens the allowed automation_logs.status values to match the
--      Pending / Success / Failed vocabulary this phase's logging is
--      specified around (plus the existing 'skipped', still produced by
--      every action today since no channel is connected yet).

alter table public.automation_logs add column if not exists rule text;

alter table public.automation_logs drop constraint if exists automation_logs_status_check;
alter table public.automation_logs add constraint automation_logs_status_check
  check (status in ('pending', 'success', 'skipped', 'failed'));

comment on column public.automation_logs.rule is
  'Which named AUTOMATION_RULES entry produced this action, if the rule was a conditional object (not the legacy unconditional-string shape). Null for unconditional/legacy rules.';

create index if not exists automation_logs_rule_idx on public.automation_logs (rule);
