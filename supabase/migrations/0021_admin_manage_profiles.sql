-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- The only existing UPDATE policy on profiles lets a user update just their
-- own row (auth.uid() = id). That's why Settings > Team had no working Edit
-- option for admins — an admin trying to change someone else's name/phone/
-- role was silently blocked by RLS. This adds a second policy letting
-- admins update any profile; the existing prevent_role_self_escalation
-- trigger still guards role/email changes to admins only.

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
