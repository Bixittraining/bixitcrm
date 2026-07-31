alter table public.attendance
  add column if not exists marked_at timestamptz not null default now();

update public.attendance set marked_at = created_at where marked_at is null;
