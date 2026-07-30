-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Backs a real installment schedule: when a lead's Fee Bill plan is
-- generated as "2 Installments" or "3 Installments", this creates one row
-- per installment with its own amount and due date, so paying installment 1
-- shows installment 2's amount/due date next, instead of one free-form
-- "pay any amount" box with no schedule behind it.

create table if not exists public.invoice_installments (
  id bigint generated always as identity primary key,
  invoice_id text not null references public.invoices(id) on delete cascade,
  seq int not null,
  amount numeric not null,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_date date,
  created_at timestamptz not null default now()
);

alter table public.invoice_installments enable row level security;

drop policy if exists "invoice_installments_all_authenticated" on public.invoice_installments;
create policy "invoice_installments_all_authenticated"
  on public.invoice_installments for all
  to authenticated
  using (true)
  with check (true);

create index if not exists invoice_installments_invoice_idx on public.invoice_installments (invoice_id, seq);
