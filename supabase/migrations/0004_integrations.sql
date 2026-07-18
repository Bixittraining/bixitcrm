-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Backs the real Settings > Integrations page: stores per-integration
-- webhook config (API IDs/secrets) and an audit trail of what happened
-- (config changes, connection tests, inbound webhook events).

create table if not exists public.integrations (
  key text primary key check (key in ('meta_ads', 'google_ads', 'whatsapp', 'justdial')),
  app_id text,
  app_secret text,
  page_id text,
  page_access_token text,
  webhook_verify_token text,
  status text not null default 'not_connected' check (status in ('not_connected', 'connected', 'error')),
  last_error text,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.integrations enable row level security;
-- No select/insert/update/delete policies for anon or authenticated roles:
-- this table holds API secrets and access tokens, so the only way to read
-- or write it is through the api/integrations/* serverless functions,
-- which verify the caller is an admin and then use the service role key
-- (which bypasses RLS entirely).

create table if not exists public.integration_audit_log (
  id bigint generated always as identity primary key,
  integration_key text not null,
  action text not null,
  detail text,
  status text not null default 'success' check (status in ('success', 'failed', 'warning')),
  created_at timestamptz not null default now()
);

alter table public.integration_audit_log enable row level security;
-- Same as above: service-role only, via api/integrations/audit-log.

create index if not exists integration_audit_log_key_created_idx
  on public.integration_audit_log (integration_key, created_at desc);

insert into public.integrations (key) values
  ('meta_ads'), ('google_ads'), ('whatsapp'), ('justdial')
on conflict (key) do nothing;
