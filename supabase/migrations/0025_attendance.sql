create table if not exists public.attendance (
  id bigint generated always as identity primary key,
  batch_id bigint not null references public.batches(id) on delete cascade,
  student_id bigint not null references public.students(id) on delete cascade,
  date date not null,
  status text not null default 'present' check (status in ('present', 'absent')),
  marked_by uuid references public.profiles(id) on delete set null,
  marked_by_name text,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

alter table public.attendance enable row level security;

drop policy if exists "attendance_all_authenticated" on public.attendance;
create policy "attendance_all_authenticated" on public.attendance
  for all to authenticated using (true) with check (true);

create index if not exists attendance_batch_date_idx on public.attendance (batch_id, date);
create index if not exists attendance_student_idx on public.attendance (student_id);
