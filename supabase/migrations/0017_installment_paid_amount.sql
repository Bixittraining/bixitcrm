-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Installments were rigid: pay exactly the fixed amount or nothing. Real
-- payments don't work that way — someone might pay less than an
-- installment (partial), or enough to cover it plus roll into the next
-- one. Adds paid_amount so each installment tracks its own running total
-- instead of a flat pending/paid flag.

alter table public.invoice_installments
  add column if not exists paid_amount numeric not null default 0;

alter table public.invoice_installments drop constraint if exists invoice_installments_status_check;
alter table public.invoice_installments add constraint invoice_installments_status_check
  check (status in ('pending', 'partial', 'paid'));
