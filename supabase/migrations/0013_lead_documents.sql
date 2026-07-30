-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Backs the Lead profile's Document Vault tab with real storage: each entry
-- is a title + link (e.g. a Google Drive/Docs URL) filed under a category,
-- rather than an actual file upload.

create table if not exists public.lead_documents (
  id bigint generated always as identity primary key,
  lead_id bigint not null references public.leads(id) on delete cascade,
  category text not null,
  title text not null,
  url text not null,
  created_at timestamptz not null default now()
);

alter table public.lead_documents enable row level security;

drop policy if exists "lead_documents_all_authenticated" on public.lead_documents;
create policy "lead_documents_all_authenticated"
  on public.lead_documents for all
  to authenticated
  using (true)
  with check (true);

create index if not exists lead_documents_lead_idx on public.lead_documents (lead_id);
