-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Creates the profiles table that backs real login + role-based access
-- (Administrator vs Sales Person) for the CRM.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role text not null default 'sales' check (role in ('admin', 'sales')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any logged-in user can read the team's names/roles (needed to show
-- who's who in the sidebar/header and the admin's team list).
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Users may update their own row (e.g. name/phone from Settings),
-- but role/email changes are blocked below unless the actor is an admin.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert/delete policy for regular users: new team members are only
-- created by the api/create-team-member serverless function using the
-- service role key, which bypasses RLS after verifying the caller is an admin.

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role or new.email is distinct from old.email then
    if not exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'Only administrators can change role or email';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_self_escalation on public.profiles;
create trigger trg_prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- One-time bootstrap for the first Administrator account:
-- 1. Supabase Dashboard > Authentication > Users > Add user
--    (email: socialmmin@gmail.com, set a real password, confirm email).
-- 2. Copy the generated user's UUID, then run:
--
-- insert into public.profiles (id, name, email, phone, role)
-- values ('<paste-uuid-here>', 'Yogesh', 'socialmmin@gmail.com', '+91 98765 43210', 'admin');
