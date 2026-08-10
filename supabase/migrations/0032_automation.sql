-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Foundation for attendance automation: events + an execution log. No
-- message sending happens yet — this just gives attendance a real,
-- persisted event trail that a future automation consumer (WhatsApp/Email/
-- in-app notifications) can be wired to, without attendance code ever
-- knowing about those channels directly.

create table if not exists public.automation_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  entity_type text not null,        -- 'student' | 'staff'
  entity_id text not null,          -- students.id or profiles.id, as text
  source_table text not null,       -- 'attendance' | 'staff_attendance' | 'attendance_threshold'
  source_id text not null,          -- the row (or synthetic key) that triggered this
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  -- The same underlying record firing the same event twice (e.g. a
  -- component re-render re-calling markAttendance with an unchanged
  -- status) is a duplicate, not a new event — this constraint is what
  -- actually enforces "do not create duplicate automation events",
  -- not just app-side discipline.
  unique (event_type, source_table, source_id)
);

create table if not exists public.automation_logs (
  id bigint generated always as identity primary key,
  event_id bigint references public.automation_events(id) on delete cascade,
  trigger text not null,            -- event_type, denormalized for easy reading without a join
  entity_type text not null,
  entity_id text not null,
  action text not null,             -- e.g. 'whatsapp_notification', 'counsellor_notification'
  status text not null check (status in ('sent', 'skipped', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

alter table public.automation_events enable row level security;
alter table public.automation_logs enable row level security;

-- Any authenticated user can emit an event (attendance can be marked by
-- any staff member) and read the log (transparency into what the system
-- did/would do) — matches this project's existing convention for
-- operational tables that aren't personally sensitive (see attendance,
-- staff_attendance).
drop policy if exists "automation_events_all_authenticated" on public.automation_events;
create policy "automation_events_all_authenticated" on public.automation_events
  for all to authenticated using (true) with check (true);

drop policy if exists "automation_logs_all_authenticated" on public.automation_logs;
create policy "automation_logs_all_authenticated" on public.automation_logs
  for all to authenticated using (true) with check (true);

create index if not exists automation_events_entity_idx on public.automation_events (entity_type, entity_id);
create index if not exists automation_logs_event_idx on public.automation_logs (event_id);
create index if not exists automation_logs_created_idx on public.automation_logs (created_at desc);
