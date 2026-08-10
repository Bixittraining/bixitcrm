// Separate status config from Student Attendance's attendanceStatus.jsx —
// staff has a different status set (Work From Home; no Half Day distinction
// used on the student side isn't shared here on purpose) so a future change
// to one doesn't silently affect the other.
export const STAFF_STATUS = {
  present: { label: 'Present', chip: { light: 'bg-emerald-50 text-emerald-600', dark: 'bg-emerald-500/15 text-emerald-400' }, btn: 'bg-emerald-500 hover:bg-emerald-600' },
  absent: { label: 'Absent', chip: { light: 'bg-rose-50 text-rose-600', dark: 'bg-rose-500/15 text-rose-400' }, btn: 'bg-rose-500 hover:bg-rose-600' },
  late: { label: 'Late', chip: { light: 'bg-amber-50 text-amber-600', dark: 'bg-amber-500/15 text-amber-400' }, btn: 'bg-amber-500 hover:bg-amber-600' },
  half_day: { label: 'Half Day', chip: { light: 'bg-sky-50 text-sky-600', dark: 'bg-sky-500/15 text-sky-400' }, btn: 'bg-sky-500 hover:bg-sky-600' },
  leave: { label: 'Leave', chip: { light: 'bg-violet-50 text-violet-600', dark: 'bg-violet-500/15 text-violet-400' }, btn: 'bg-violet-500 hover:bg-violet-600' },
  wfh: { label: 'WFH', chip: { light: 'bg-indigo-50 text-indigo-600', dark: 'bg-indigo-500/15 text-indigo-400' }, btn: 'bg-indigo-500 hover:bg-indigo-600' },
}
export const STAFF_STATUS_KEYS = Object.keys(STAFF_STATUS)

export function StaffStatusChip({ status, isDark }) {
  if (!status) return <span className={`px-2 py-1 rounded-md text-[11px] font-medium ${isDark ? 'bg-dark-700 text-dark-400' : 'bg-dark-200 text-dark-500'}`}>Not marked</span>
  const s = STAFF_STATUS[status]
  return <span className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap ${isDark ? s.chip.dark : s.chip.light}`}>{s.label}</span>
}
