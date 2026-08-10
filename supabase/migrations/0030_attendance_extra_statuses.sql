-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Student Attendance needs Late and Half Day in addition to the existing
-- Present/Absent, plus Leave (staff_attendance already has Leave; students
-- didn't). Extends the existing check constraint instead of creating a new
-- table — no new columns needed, marked_at/marked_by already cover
-- check-in time and who marked it.

alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance add constraint attendance_status_check
  check (status in ('present', 'absent', 'late', 'half_day', 'leave'));
