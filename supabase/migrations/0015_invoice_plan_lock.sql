-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Adds a real payment plan + lock to invoices. Once a fee bill's payment
-- plan (Full Payment / 2 Installments / 3 Installments) is generated from
-- the lead's Fee Bill tab, it locks so it can't be silently re-picked —
-- only an admin can unlock it to change the plan.

alter table public.invoices
  add column if not exists payment_plan text,
  add column if not exists locked boolean not null default false;
