-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- One structured place to record why a lead was closed (Lost/Not Interested,
-- both stored as status='lost' with a reason — see leadStatus.jsx) or why
-- it was parked in Nurture, instead of scraping it back out of free-text
-- notes. Purely additive — existing rows get NULL and are otherwise
-- untouched; history isn't rewritten, only new closures populate this.

alter table public.leads add column if not exists closure_reason text;
alter table public.leads add column if not exists closure_note text;
