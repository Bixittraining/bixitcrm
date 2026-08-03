create table if not exists public.email_messages (
  id bigint generated always as identity primary key,
  lead_id bigint references public.leads(id) on delete cascade,
  student_id bigint references public.students(id) on delete cascade,
  to_email text not null,
  from_email text not null,
  subject text not null,
  body text not null,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_name text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

alter table public.email_messages enable row level security;

drop policy if exists "email_messages_all_authenticated" on public.email_messages;
create policy "email_messages_all_authenticated" on public.email_messages
  for all to authenticated using (true) with check (true);

create index if not exists email_messages_lead_idx on public.email_messages (lead_id);
create index if not exists email_messages_student_idx on public.email_messages (student_id);
