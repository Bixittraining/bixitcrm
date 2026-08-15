-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Updates the "New Lead Welcome Message" workflow's send_email action
-- (0048) to a "thanks for choosing us" tone and turns on includeSyllabus
-- (see automationLib.ts's send_email case) so the email automatically
-- appends the real syllabus for the lead's course, not just a generic
-- welcome line.

do $$
declare
  wf_id bigint;
begin
  select id into wf_id from public.automation_workflows
    where not is_template and name = 'New Lead Welcome Message';

  if wf_id is not null then
    update public.automation_workflow_actions
    set config = '{
      "subject": "Thanks for Choosing BIX IT Academy!",
      "message": "Hi,\n\nThank you for choosing BIX IT Academy! We''re excited to help you on your learning journey. Our team will reach out to you shortly to guide you through the next steps.\n\nIf you have any questions in the meantime, just reply to this email.\n\nWarm regards,\nTeam BIX IT Academy",
      "includeSyllabus": true
    }'::jsonb
    where workflow_id = wf_id and action_type = 'send_email';
  end if;
end $$;
