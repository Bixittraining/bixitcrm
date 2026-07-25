-- URGENT — run this immediately in the Supabase SQL Editor.
--
-- leads, students, invoices, follow_ups, and packages currently have NO
-- row level security, which means they are publicly readable (and writable)
-- by anyone on the internet using nothing but the public anon key every
-- Supabase web app ships with — no login required. Verified live via:
--   curl "$VITE_SUPABASE_URL/rest/v1/leads?select=*&limit=1" -H "apikey: $VITE_SUPABASE_ANON_KEY"
-- which returned real lead data with zero authentication.
--
-- This locks all five tables down to logged-in CRM users only (any
-- authenticated team member — admin or sales — can read/write all rows,
-- matching how the app already behaves today; there is no per-row
-- ownership model in the UI to restrict further than that).

alter table public.leads enable row level security;
alter table public.students enable row level security;
alter table public.invoices enable row level security;
alter table public.follow_ups enable row level security;
alter table public.packages enable row level security;

drop policy if exists "leads_all_authenticated" on public.leads;
create policy "leads_all_authenticated"
  on public.leads for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "students_all_authenticated" on public.students;
create policy "students_all_authenticated"
  on public.students for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "invoices_all_authenticated" on public.invoices;
create policy "invoices_all_authenticated"
  on public.invoices for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "follow_ups_all_authenticated" on public.follow_ups;
create policy "follow_ups_all_authenticated"
  on public.follow_ups for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "packages_all_authenticated" on public.packages;
create policy "packages_all_authenticated"
  on public.packages for all
  to authenticated
  using (true)
  with check (true);

-- No policy is added for the anon/public role on any of these tables,
-- which — with RLS enabled — means anonymous requests are now rejected
-- entirely instead of silently allowed.

-- These tables also had a pre-existing "anon_and_auth_all_*" policy each
-- (roles: {anon,authenticated}, qual: true) predating this migration —
-- likely left over from initial table setup — which alone was enough to
-- keep every table fully public no matter what was added above, since
-- Postgres OR's multiple RLS policies together. Confirmed via a live,
-- unauthenticated request against /rest/v1/leads still returning real rows
-- even after the policies above were applied. This drops any policy on
-- these five tables that grants the anon role, regardless of its name.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where tablename in ('leads', 'students', 'invoices', 'follow_ups', 'packages')
      and 'anon' = any(roles)
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;
