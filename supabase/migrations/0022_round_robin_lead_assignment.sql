-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Every new lead (manually added, CSV imported, or coming in through a
-- webhook — Google Ads / Meta Ads / JustDial / WhatsApp) now gets
-- auto-assigned to a Sales Executive in round-robin order, instead of
-- landing on whoever happened to create it (or Unassigned for webhook
-- leads). The rotation pointer lives in this singleton table so it's
-- shared and consistent across every lead source.

create table if not exists public.round_robin_state (
  id boolean primary key default true check (id),
  last_assigned_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.round_robin_state (id) values (true)
on conflict (id) do nothing;

alter table public.round_robin_state enable row level security;

drop policy if exists "round_robin_state_select_authenticated" on public.round_robin_state;
create policy "round_robin_state_select_authenticated"
  on public.round_robin_state for select
  to authenticated
  using (true);

-- security definer + row lock (`for update`) so concurrent lead inserts
-- (e.g. two webhooks firing at once) can't both land on the same rep.
create or replace function public.assign_next_sales_rep()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rep_ids uuid[];
  last_id uuid;
  next_id uuid;
  last_idx int;
begin
  select last_assigned_id into last_id from public.round_robin_state where id = true for update;

  select array_agg(id order by created_at asc) into rep_ids
  from public.profiles where role = 'sales';

  if rep_ids is null or array_length(rep_ids, 1) = 0 then
    return null;
  end if;

  last_idx := array_position(rep_ids, last_id);
  if last_idx is null then
    next_id := rep_ids[1];
  else
    next_id := rep_ids[(last_idx % array_length(rep_ids, 1)) + 1];
  end if;

  update public.round_robin_state set last_assigned_id = next_id, updated_at = now() where id = true;
  return next_id;
end;
$$;

grant execute on function public.assign_next_sales_rep() to authenticated;
