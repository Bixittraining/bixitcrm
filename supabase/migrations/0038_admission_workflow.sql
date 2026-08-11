-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Supports the admission workflow: a counsellor-applied discount on the
-- lead (carried into the fee bill at enrollment), the same discount kept
-- on the invoice for the record, and a payment reference field. Purely
-- additive — every existing row defaults to 0%/NULL and is otherwise
-- untouched.

alter table public.leads add column if not exists discount_percent numeric not null default 0;
alter table public.leads drop constraint if exists leads_discount_percent_check;
alter table public.leads add constraint leads_discount_percent_check check (discount_percent >= 0 and discount_percent <= 100);

alter table public.invoices add column if not exists discount_percent numeric not null default 0;
alter table public.invoices add column if not exists reference text;
