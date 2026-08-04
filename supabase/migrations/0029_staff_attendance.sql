create table if not exists public.staff_attendance (
  id bigint generated always as identity primary key,
  staff_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  status text not null default 'present' check (status in ('present', 'absent', 'leave')),
  marked_by uuid references public.profiles(id) on delete set null,
  marked_by_name text,
  marked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (staff_id, date)
);

alter table public.staff_attendance enable row level security;

drop policy if exists "staff_attendance_all_authenticated" on public.staff_attendance;
create policy "staff_attendance_all_authenticated" on public.staff_attendance
  for all to authenticated using (true) with check (true);

create index if not exists staff_attendance_date_idx on public.staff_attendance (date);
create index if not exists staff_attendance_staff_idx on public.staff_attendance (staff_id);
