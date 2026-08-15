-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Adds a 24-hour follow-up nudge to the existing "New Lead Welcome
-- Message" workflow (0048) — same trigger (LEAD_CREATED), same execution,
-- just a third action with delay_minutes = 1440 (24h) so it runs a day
-- after the welcome message via the engine's run_scheduled sweep. Kept on
-- the SAME workflow rather than a new one: it's one execution per lead,
-- not two competing workflows racing the idempotency guard.

do $$
declare
  wf_id bigint;
  next_position int;
begin
  select id into wf_id from public.automation_workflows
    where not is_template and name = 'New Lead Welcome Message';

  if wf_id is not null
     and not exists (
       select 1 from public.automation_workflow_actions
       where workflow_id = wf_id and delay_minutes = 1440 and action_type = 'send_whatsapp'
     )
  then
    select coalesce(max(position), -1) + 1 into next_position
      from public.automation_workflow_actions where workflow_id = wf_id;

    insert into public.automation_workflow_actions (workflow_id, action_type, config, delay_minutes, position) values
      (wf_id, 'send_whatsapp',
       '{"message":"Hi! Just checking in — did you get a chance to think about your enquiry with BIX IT Academy? Reply here anytime and we''ll help you pick the right course, or share the syllabus if you''d like."}',
       1440, next_position);
  end if;
end $$;
