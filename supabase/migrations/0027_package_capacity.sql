alter table public.packages
  add column if not exists capacity integer not null default 30;
