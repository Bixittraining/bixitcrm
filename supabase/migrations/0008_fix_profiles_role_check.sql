-- Run this once in the Supabase SQL Editor.
-- profiles_role_check has existed since before any of our migrations,
-- allowing only ('admin', 'counselor', 'staff') — never 'sales', which is
-- what api/create-team-member.js, Settings.jsx, and every role-gate in the
-- app (isAdmin checks, RLS policies) actually use. This is why "Add Team
-- Member" with the Sales Person role has been failing with:
--   new row for relation "profiles" violates check constraint "profiles_role_check"
--
-- Widens the constraint to also allow 'sales', without removing the
-- pre-existing values (in case any current rows use them).

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'sales', 'counselor', 'staff'));
