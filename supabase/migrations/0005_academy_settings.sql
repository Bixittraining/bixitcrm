-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Backs the Settings > Academy tab: a single row of editable business info
-- (name, contact details, GST, address) shown/used across the CRM.

create table if not exists public.academy_settings (
  id boolean primary key default true check (id),
  name text not null default 'BIX Academy',
  contact_email text not null default '',
  phone text not null default '',
  website text not null default '',
  gst_number text not null default '',
  address text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.academy_settings enable row level security;

-- Any logged-in user can read the academy's info (shown in the sidebar,
-- future invoice headers, etc.).
drop policy if exists "academy_settings_select_authenticated" on public.academy_settings;
create policy "academy_settings_select_authenticated"
  on public.academy_settings for select
  to authenticated
  using (true);

-- Only admins can change it.
drop policy if exists "academy_settings_update_admin" on public.academy_settings;
create policy "academy_settings_update_admin"
  on public.academy_settings for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

insert into public.academy_settings (id) values (true) on conflict (id) do nothing;
