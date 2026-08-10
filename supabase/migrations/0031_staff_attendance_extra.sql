-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Staff Attendance needs Late, Half Day, and Work From Home in addition to
-- the existing Present/Absent/Leave. Extends the existing check constraint
-- instead of a new table. Also adds an optional `department` field to
-- profiles for the Staff List's Department column — nullable, so nothing
-- breaks for existing team members who don't have one set yet.

alter table public.staff_attendance drop constraint if exists staff_attendance_status_check;
alter table public.staff_attendance add constraint staff_attendance_status_check
  check (status in ('present', 'absent', 'late', 'half_day', 'leave', 'wfh'));

alter table public.profiles add column if not exists department text;
