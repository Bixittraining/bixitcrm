-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Adds the meeting-specific pieces needed to integrate counselling meetings
-- with the lead funnel: a "No Show" status and a Meeting Type (in-person/
-- online/phone). Purely additive — every existing follow_ups row is
-- untouched; meeting_type defaults to NULL for rows that predate this
-- (including all non-meeting follow-ups, where it's simply not used).

alter table public.follow_ups drop constraint if exists follow_ups_status_check;
alter table public.follow_ups add constraint follow_ups_status_check
  check (status in ('pending', 'completed', 'cancelled', 'no_show'));

alter table public.follow_ups add column if not exists meeting_type text;
alter table public.follow_ups drop constraint if exists follow_ups_meeting_type_check;
alter table public.follow_ups add constraint follow_ups_meeting_type_check
  check (meeting_type is null or meeting_type in ('in_person', 'online', 'phone'));
