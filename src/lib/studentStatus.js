// Single source of truth for the Student lifecycle — same convention as
// lib/leadStatus.jsx. Five real statuses, nothing invented: a student is
// Active, Completed, On Hold, Dropped, or Transferred, and that value
// drives every badge/filter across Students.jsx, StudentDetail.jsx, and
// BatchDetail.jsx instead of each screen spelling out its own label/color.
import { UserCheck, GraduationCap, PauseCircle, UserX, ArrowRightLeft } from 'lucide-react'

export const STUDENT_STATUSES = {
  active: { label: 'Active', color: 'emerald', icon: UserCheck },
  completed: { label: 'Completed', color: 'primary', icon: GraduationCap, terminal: true },
  on_hold: { label: 'On Hold', color: 'amber', icon: PauseCircle },
  dropped: { label: 'Dropped', color: 'rose', icon: UserX, terminal: true },
  transferred: { label: 'Transferred', color: 'indigo', icon: ArrowRightLeft, terminal: true },
}

export const ALL_STUDENT_STATUS_KEYS = Object.keys(STUDENT_STATUSES)

export function studentStatusLabel(key) { return STUDENT_STATUSES[key]?.label || key }
export function studentStatusColor(key) { return STUDENT_STATUSES[key]?.color || 'emerald' }
export function studentStatusIcon(key) { return STUDENT_STATUSES[key]?.icon }
export function isTerminalStudentStatus(key) { return !!STUDENT_STATUSES[key]?.terminal }

// The threshold below which attendance flags "Needs Attention" — was
// hardcoded as 75 in four disconnected places (three UI, one automation
// constant). Now reads the real, admin-configurable value from
// academy_settings (migration 0045), falling back to the automation
// module's constant only if that row is ever unreachable.
export function getAttendanceThreshold(academySettings, fallback = 75) {
  return academySettings?.attendance_threshold_percent ?? fallback
}

// "Significantly behind" progress — real, not arbitrary: expected
// progress is a straight-line interpolation between the batch's start and
// end dates (or enroll date -> today if the batch has no end date), and a
// student is flagged if their actual overall progress trails that by more
// than this many percentage points. No progress data at all is its own
// (separate) "needs attention" condition, handled by the caller — this
// function only judges students who have at least one progress module.
const PROGRESS_BEHIND_THRESHOLD = 20
export function isProgressBehindExpected(overallPercent, startDate, endDate) {
  if (!startDate || !endDate || overallPercent == null) return false
  const start = new Date(`${startDate}T00:00:00`).getTime()
  const end = new Date(`${endDate}T00:00:00`).getTime()
  const now = Date.now()
  if (!(end > start) || now <= start) return false
  const expectedPercent = Math.min(100, Math.round(((now - start) / (end - start)) * 100))
  return expectedPercent - overallPercent > PROGRESS_BEHIND_THRESHOLD
}
