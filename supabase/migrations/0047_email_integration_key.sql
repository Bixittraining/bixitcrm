-- The 'email' integration (Settings > Integrations > Email (Gmail), and now
-- the automation engine's send_email action) has been referenced in app
-- code since api/integrations/_shared.js's VALID_KEYS and api/email/send.js,
-- but migration 0004_integrations.sql's check constraint never included it
-- alongside meta_ads/google_ads/whatsapp/justdial — so saving it has always
-- failed at the DB layer. Idempotent: safe to run whether or not a prior
-- manual fix already exists.

alter table public.integrations drop constraint if exists integrations_key_check;
alter table public.integrations add constraint integrations_key_check
  check (key in ('meta_ads', 'google_ads', 'whatsapp', 'justdial', 'email'));

insert into public.integrations (key) values ('email')
on conflict (key) do nothing;
