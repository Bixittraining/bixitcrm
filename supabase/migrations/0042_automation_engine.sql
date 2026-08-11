-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- The Central Automation Engine's data model: WHEN (trigger) / IF
-- (conditions) / THEN (actions), plus execution + logging.
--
-- Deliberately reuses rather than duplicates:
--   - automation_events (0032) stays the single EVENT record — a workflow
--     execution references the event that caused it (automation_executions.
--     event_id), it does not create a second copy of "what happened".
--   - automation_logs (0032/0041) stays exactly what it was — the low-level
--     action log for the OLDER flat event->action wiring (Attendance,
--     and the Lead lifecycle events emitted directly from DataContext).
--     Workflow runs get their own automation_executions/
--     automation_execution_actions tables instead of overloading that one,
--     because a workflow execution needs richer state (ordered actions,
--     per-action retry, a lead reference, an overall run status) that
--     automation_logs was never shaped for.
--   - leads/follow_ups/lead_notes/lead_activities are read and written by
--     actions, never duplicated — e.g. "Create Follow-up" inserts one real
--     follow_ups row, the same table the rest of the CRM already uses.

-- ── WORKFLOWS ──────────────────────────────────────────────────────────
create table if not exists public.automation_workflows (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  trigger_event text not null,       -- one of AUTOMATION_EVENTS (src/lib/automation.js)
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive')),
  is_template boolean not null default false,  -- seeded starter workflows shown under "Templates"
  created_by uuid references public.profiles(id) on delete set null,
  created_by_name text,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_workflow_conditions (
  id bigint generated always as identity primary key,
  workflow_id bigint not null references public.automation_workflows(id) on delete cascade,
  field text not null,               -- 'source' | 'course' | 'status' | 'priority' | 'assigned_to' | 'package' | 'lead_value' | 'followup_status' | 'payment_status' | 'days_since_created' | 'days_since_last_activity'
  operator text not null check (operator in ('equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty')),
  value text,                        -- null allowed for is_empty/is_not_empty
  position int not null default 0
);

create table if not exists public.automation_workflow_actions (
  id bigint generated always as identity primary key,
  workflow_id bigint not null references public.automation_workflows(id) on delete cascade,
  action_type text not null,         -- 'assign_lead' | 'create_follow_up' | 'create_task' | 'change_lead_status' | 'add_note' | 'create_internal_notification' | 'send_whatsapp' | 'send_email'
  config jsonb not null default '{}',
  delay_minutes int not null default 0,  -- 0 = run immediately when the workflow fires; >0 = "THEN ... after N" (see automation_execution_actions.run_at)
  position int not null default 0   -- execution order within the workflow
);

-- ── EXECUTIONS (one row per workflow run against one event) ────────────
create table if not exists public.automation_executions (
  id bigint generated always as identity primary key,
  workflow_id bigint references public.automation_workflows(id) on delete set null,
  workflow_name text not null,       -- denormalized so a log entry still reads correctly if the workflow is later edited/deleted
  event_id bigint references public.automation_events(id) on delete set null,
  trigger_event text not null,
  entity_type text not null default 'lead',
  lead_id bigint references public.leads(id) on delete set null,
  status text not null default 'running' check (status in ('running', 'completed', 'partially_failed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  -- THE duplicate-execution guard (spec section 9): the same workflow can
  -- only ever produce one execution row for the same event. A second
  -- attempt (retried invocation, re-render, whatever) hits this and is
  -- treated as "already handled", not a new run.
  unique (workflow_id, event_id)
);

create table if not exists public.automation_execution_actions (
  id bigint generated always as identity primary key,
  execution_id bigint not null references public.automation_executions(id) on delete cascade,
  action_id bigint references public.automation_workflow_actions(id) on delete set null,
  action_type text not null,         -- denormalized, survives the workflow action being edited/reordered/deleted later
  config jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'running', 'success', 'failed', 'skipped')),
  result jsonb,                      -- e.g. { "followUpId": 123 } — created-entity ids, for future dedup-on-retry
  error text,
  run_at timestamptz not null default now(),  -- when this action should run; > now() for delayed/business-hours-deferred actions
  started_at timestamptz,
  completed_at timestamptz,
  retry_count int not null default 0,
  position int not null default 0
);

-- ── BUSINESS HOURS (singleton, prepared for the WhatsApp/Email phase) ──
-- Not enforced by anything communication-related yet — nothing sends a
-- message today. The engine already checks this table before running a
-- send_whatsapp/send_email action so the restriction is live the moment a
-- real channel is connected, without another migration.
create table if not exists public.automation_settings (
  id boolean primary key default true check (id),
  business_hours_enabled boolean not null default false,
  business_hours_start time not null default '09:00',
  business_hours_end time not null default '19:00',
  business_days int[] not null default '{1,2,3,4,5,6}',  -- 0=Sunday .. 6=Saturday; default Mon-Sat
  timezone text not null default 'Asia/Kolkata',
  updated_at timestamptz not null default now()
);
insert into public.automation_settings (id) values (true) on conflict (id) do nothing;

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.automation_workflows enable row level security;
alter table public.automation_workflow_conditions enable row level security;
alter table public.automation_workflow_actions enable row level security;
alter table public.automation_executions enable row level security;
alter table public.automation_execution_actions enable row level security;
alter table public.automation_settings enable row level security;

-- Workflows/conditions/actions: admins and managers can see them (matches
-- ROLE_PERMISSIONS.automation in src/lib/permissions.js — sales gets []);
-- only admins can write, per that same config (manager is 'view'-only).
-- The engine itself never uses these policies — it runs as the Edge
-- Function's service-role client, which bypasses RLS entirely, so a
-- workflow still executes correctly even though the sales rep whose
-- action triggered it has no access to read/write it here.
drop policy if exists "automation_workflows_select_admin_manager" on public.automation_workflows;
create policy "automation_workflows_select_admin_manager" on public.automation_workflows
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'manager')));
drop policy if exists "automation_workflows_write_admin" on public.automation_workflows;
create policy "automation_workflows_write_admin" on public.automation_workflows
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "automation_workflow_conditions_select_admin_manager" on public.automation_workflow_conditions;
create policy "automation_workflow_conditions_select_admin_manager" on public.automation_workflow_conditions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'manager')));
drop policy if exists "automation_workflow_conditions_write_admin" on public.automation_workflow_conditions;
create policy "automation_workflow_conditions_write_admin" on public.automation_workflow_conditions
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "automation_workflow_actions_select_admin_manager" on public.automation_workflow_actions;
create policy "automation_workflow_actions_select_admin_manager" on public.automation_workflow_actions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'manager')));
drop policy if exists "automation_workflow_actions_write_admin" on public.automation_workflow_actions;
create policy "automation_workflow_actions_write_admin" on public.automation_workflow_actions
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Executions/execution actions: read-only from the client, admin+manager
-- (matches the 'view_logs' permission). Writes only ever come from the
-- Edge Function's service-role client (trigger/retry/run_scheduled) — no
-- authenticated-role write policy exists here on purpose, so a compromised
-- or buggy frontend can never fabricate a "Success" log entry.
drop policy if exists "automation_executions_select_admin_manager" on public.automation_executions;
create policy "automation_executions_select_admin_manager" on public.automation_executions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'manager')));

drop policy if exists "automation_execution_actions_select_admin_manager" on public.automation_execution_actions;
create policy "automation_execution_actions_select_admin_manager" on public.automation_execution_actions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'manager')));

drop policy if exists "automation_settings_select_admin_manager" on public.automation_settings;
create policy "automation_settings_select_admin_manager" on public.automation_settings
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'manager')));
drop policy if exists "automation_settings_write_admin" on public.automation_settings;
create policy "automation_settings_write_admin" on public.automation_settings
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── INDEXES ──────────────────────────────────────────────────────────
create index if not exists automation_workflows_trigger_status_idx on public.automation_workflows (trigger_event, status);
create index if not exists automation_workflow_conditions_workflow_idx on public.automation_workflow_conditions (workflow_id);
create index if not exists automation_workflow_actions_workflow_idx on public.automation_workflow_actions (workflow_id, position);
create index if not exists automation_executions_workflow_idx on public.automation_executions (workflow_id);
create index if not exists automation_executions_lead_idx on public.automation_executions (lead_id);
create index if not exists automation_executions_started_idx on public.automation_executions (started_at desc);
create index if not exists automation_execution_actions_execution_idx on public.automation_execution_actions (execution_id, position);
create index if not exists automation_execution_actions_scheduled_idx on public.automation_execution_actions (status, run_at) where status in ('pending', 'scheduled');

-- ── DEFAULT TEMPLATES (disabled — an admin picks "Use this template" to
-- clone one into a real, editable workflow; see spec section 16) ───────
do $$
declare
  wf_id bigint;
begin
  if not exists (select 1 from public.automation_workflows where is_template and name = 'New Lead Welcome') then
    insert into public.automation_workflows (name, description, trigger_event, status, is_template, created_by_name)
    values ('New Lead Welcome', 'Assigns a new lead and schedules the first follow-up call.', 'LEAD_CREATED', 'draft', true, 'System')
    returning id into wf_id;
    insert into public.automation_workflow_actions (workflow_id, action_type, config, delay_minutes, position) values
      (wf_id, 'assign_lead', '{"mode":"round_robin"}', 0, 0),
      (wf_id, 'create_follow_up', '{"type":"call","delayDays":0,"notes":"First contact call"}', 0, 1);
  end if;

  if not exists (select 1 from public.automation_workflows where is_template and name = 'Follow-up Reminder') then
    insert into public.automation_workflows (name, description, trigger_event, status, is_template, created_by_name)
    values ('Follow-up Reminder', 'Notifies the assigned executive when a follow-up goes overdue.', 'FOLLOW_UP_OVERDUE', 'draft', true, 'System')
    returning id into wf_id;
    insert into public.automation_workflow_actions (workflow_id, action_type, config, delay_minutes, position) values
      (wf_id, 'create_internal_notification', '{"message":"A follow-up is overdue — please review and reschedule or complete it."}', 0, 0);
  end if;

  if not exists (select 1 from public.automation_workflows where is_template and name = 'Counselling Reminder') then
    insert into public.automation_workflows (name, description, trigger_event, status, is_template, created_by_name)
    values ('Counselling Reminder', 'Internal reminder when a counselling session is scheduled.', 'COUNSELLING_SCHEDULED', 'draft', true, 'System')
    returning id into wf_id;
    insert into public.automation_workflow_actions (workflow_id, action_type, config, delay_minutes, position) values
      (wf_id, 'create_internal_notification', '{"message":"A counselling session was scheduled for this lead."}', 0, 0);
  end if;

  if not exists (select 1 from public.automation_workflows where is_template and name = 'Enrollment Workflow') then
    insert into public.automation_workflows (name, description, trigger_event, status, is_template, created_by_name)
    values ('Enrollment Workflow', 'Creates an internal onboarding task when a lead enrolls.', 'LEAD_ENROLLED', 'draft', true, 'System')
    returning id into wf_id;
    insert into public.automation_workflow_actions (workflow_id, action_type, config, delay_minutes, position) values
      (wf_id, 'create_task', '{"type":"call","delayDays":1,"notes":"Onboarding check-in call"}', 0, 0);
  end if;

  if not exists (select 1 from public.automation_workflows where is_template and name = 'Facebook Lead Follow-up') then
    insert into public.automation_workflows (name, description, trigger_event, status, is_template, created_by_name)
    values ('Facebook Lead Follow-up', 'Assigns and follows up on leads sourced from Facebook.', 'LEAD_CREATED', 'draft', true, 'System')
    returning id into wf_id;
    insert into public.automation_workflow_conditions (workflow_id, field, operator, value, position) values
      (wf_id, 'source', 'equals', 'Facebook', 0);
    insert into public.automation_workflow_actions (workflow_id, action_type, config, delay_minutes, position) values
      (wf_id, 'assign_lead', '{"mode":"round_robin"}', 0, 0),
      (wf_id, 'create_follow_up', '{"type":"call","delayDays":0,"notes":"Follow up on Facebook inquiry"}', 0, 1),
      (wf_id, 'send_whatsapp', '{"message":"Hi! Thanks for your interest in BIX IT Academy. Our team will call you shortly."}', 5, 2),
      (wf_id, 'send_email', '{"message":"Welcome email — not connected yet."}', 5, 3);
  end if;

  if not exists (select 1 from public.automation_workflows where is_template and name = 'Payment Reminder') then
    insert into public.automation_workflows (name, description, trigger_event, status, is_template, created_by_name)
    values ('Payment Reminder', 'Internal notification when a fee bill is left pending.', 'PAYMENT_PENDING', 'draft', true, 'System')
    returning id into wf_id;
    insert into public.automation_workflow_actions (workflow_id, action_type, config, delay_minutes, position) values
      (wf_id, 'create_internal_notification', '{"message":"A fee bill is pending payment for this lead."}', 0, 0);
  end if;
end $$;

comment on table public.automation_workflows is 'WHEN/IF/THEN workflow definitions. is_template rows are read-only starting points shown under Automation > Templates.';
comment on table public.automation_executions is 'One row per workflow run against one automation_events row. unique(workflow_id, event_id) is the duplicate-execution guard.';
comment on table public.automation_execution_actions is 'One row per configured action within an execution, in position order. run_at supports delayed actions and business-hours deferral.';
