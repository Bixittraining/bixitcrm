-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Three additions for the Attendance & Productivity final-integration pass:
--   1. Batches gain Class Mode + Meeting/Room info (name/course/trainer/
--      start-end date/days/times already existed — see 0018-era batch
--      migrations — only these two were genuinely missing).
--   2. Attendance gains override metadata — was this mark made on a date
--      the batch doesn't actually run classes on?
--   3. A general-purpose audit_logs table. NOT a duplicate of
--      integration_audit_log (0004_integrations.sql) — that one is
--      service-role-only and scoped to integration key/action/status with
--      no user or entity attribution; this one is for "who changed what,
--      from what, to what, and why" across attendance/schedule/reports.

alter table public.batches add column if not exists class_mode text check (class_mode in ('online', 'offline', 'hybrid'));
alter table public.batches add column if not exists meeting_info text;

alter table public.attendance add column if not exists is_override boolean not null default false;
alter table public.attendance add column if not exists override_reason text;

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text,
  action text not null,             -- e.g. 'Attendance Corrected', 'Report Exported'
  module text not null,             -- e.g. 'attendance', 'staff_attendance', 'class_schedule', 'reports'
  entity_type text,                 -- e.g. 'student', 'staff', 'batch'
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- Any authenticated user can write an audit entry (the action they're
-- performing is what's being audited, not a privileged step of its own),
-- but only admins can read the log back — matches how sensitive
-- read-back-only data is already handled elsewhere in this project
-- (e.g. user_sessions' "own or admin" policy).
drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;
create policy "audit_logs_insert_authenticated" on public.audit_logs
  for insert to authenticated with check (true);

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin" on public.audit_logs
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create index if not exists audit_logs_module_created_idx on public.audit_logs (module, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
