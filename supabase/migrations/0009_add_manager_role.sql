-- Run this once in the Supabase SQL Editor.
-- Adds 'manager' as a valid role, alongside the existing admin/sales
-- (and the pre-existing counselor/staff values, kept for safety).
-- Manager gets the same Team + Academy management access as Admin, but
-- not Integrations/API (those stay strictly admin-only).

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'manager', 'sales', 'counselor', 'staff'));

-- Academy settings: let managers edit it too (previously admin-only).
drop policy if exists "academy_settings_update_admin" on public.academy_settings;
create policy "academy_settings_update_admin"
  on public.academy_settings for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager')));
