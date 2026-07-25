-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Backs a real WhatsApp inbox: one row per phone number in
-- whatsapp_conversations (bot/human mode, last message preview), and every
-- inbound/outbound message in whatsapp_messages. Any authenticated team
-- member can view and reply to any conversation — same no-per-row-ownership
-- model as leads/students/invoices elsewhere in this CRM.

create table if not exists public.whatsapp_conversations (
  phone text primary key,
  lead_id bigint references public.leads(id) on delete set null,
  contact_name text,
  mode text not null default 'bot' check (mode in ('bot', 'human')),
  last_message text,
  last_message_at timestamptz,
  unread_count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_conversations enable row level security;

drop policy if exists "whatsapp_conversations_all_authenticated" on public.whatsapp_conversations;
create policy "whatsapp_conversations_all_authenticated"
  on public.whatsapp_conversations for all
  to authenticated
  using (true)
  with check (true);

create table if not exists public.whatsapp_messages (
  id bigint generated always as identity primary key,
  phone text not null references public.whatsapp_conversations(phone) on delete cascade,
  lead_id bigint references public.leads(id) on delete set null,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender text not null check (sender in ('contact', 'bot', 'human')),
  body text not null,
  template_name text,
  wamid text,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'read', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.whatsapp_messages enable row level security;

drop policy if exists "whatsapp_messages_all_authenticated" on public.whatsapp_messages;
create policy "whatsapp_messages_all_authenticated"
  on public.whatsapp_messages for all
  to authenticated
  using (true)
  with check (true);

create index if not exists whatsapp_messages_phone_created_idx
  on public.whatsapp_messages (phone, created_at desc);
