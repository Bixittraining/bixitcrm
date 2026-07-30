-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Backs a real login/logout activity log: one row per session, stamped on
-- sign-in and closed out on sign-out. Admin-only visibility — a regular
-- team member can only see their own sessions, an admin can see everyone's.

create table if not exists public.user_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  login_at timestamptz not null default now(),
  logout_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_sessions enable row level security;

drop policy if exists "user_sessions_insert_own" on public.user_sessions;
create policy "user_sessions_insert_own"
  on public.user_sessions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_sessions_update_own" on public.user_sessions;
create policy "user_sessions_update_own"
  on public.user_sessions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_sessions_select_own_or_admin" on public.user_sessions;
create policy "user_sessions_select_own_or_admin"
  on public.user_sessions for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create index if not exists user_sessions_user_idx on public.user_sessions (user_id, login_at desc);
