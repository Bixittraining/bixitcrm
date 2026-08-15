-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Real, active workflow (not a template): every new lead — regardless of
-- source (Meta Ads, JustDial, website, walk-in, manual entry, anything
-- that calls insertLead/creates a leads row) — gets an automated welcome
-- on WhatsApp and Email. No conditions, on purpose: "any kind of source
-- doesn't matter" means this must match every LEAD_CREATED event.

do $$
declare
  wf_id bigint;
begin
  if not exists (select 1 from public.automation_workflows where not is_template and name = 'New Lead Welcome Message') then
    insert into public.automation_workflows (name, description, trigger_event, status, is_template, created_by_name)
    values (
      'New Lead Welcome Message',
      'Sends an automatic WhatsApp + Email welcome to every new lead, no matter the source.',
      'LEAD_CREATED', 'active', false, 'System'
    )
    returning id into wf_id;

    insert into public.automation_workflow_actions (workflow_id, action_type, config, delay_minutes, position) values
      (wf_id, 'send_whatsapp', '{"message":"Hi! Thank you for reaching out to BIX IT Academy. We''ve received your enquiry and one of our counsellors will get in touch with you shortly. Meanwhile, feel free to reply here with any questions!"}', 0, 0),
      (wf_id, 'send_email', '{"subject":"Welcome to BIX IT Academy!","message":"Hi,\n\nThank you for your interest in BIX IT Academy! We''ve received your enquiry and our team will reach out to you shortly to help with next steps.\n\nIf you have any questions in the meantime, just reply to this email.\n\nWarm regards,\nTeam BIX IT Academy"}', 0, 1);
  end if;
end $$;
