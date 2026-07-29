-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Adds a real "Agent" (assigned team member) to each lead so the Leads table
-- can show who currently owns it, and team members can explicitly "take
-- over" a lead.

alter table public.leads
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;

create index if not exists leads_assigned_to_idx on public.leads (assigned_to);
