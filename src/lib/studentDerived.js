// Shared derived-value helpers for the Students module — used by both
// Students.jsx (list/card/table) and StudentDetail.jsx (profile) so a
// student's attendance %, progress %, next class, and "needs attention"
// reasons are computed identically everywhere they're shown.
import { getAttendanceThreshold, isProgressBehindExpected } from './studentStatus'

// A course's real duration comes from the matched package's `duration`
// text (e.g. "6 Months") — parsed just enough to project an expected
// completion date. If it can't be parsed, we simply don't show one rather
// than guess.
export function addDurationToDate(dateStr, durationText) {
  if (!dateStr || !durationText) return null
  const match = String(durationText).match(/(\d+)\s*(month|week|day)/i)
  if (!match) return null
  const n = Number(match[1])
  const unit = match[2].toLowerCase()
  const d = new Date(`${dateStr}T00:00:00`)
  if (unit === 'month') d.setMonth(d.getMonth() + n)
  else if (unit === 'week') d.setDate(d.getDate() + n * 7)
  else d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
export function nextClassLabel(batch) {
  if (!batch?.schedule_days?.length || !batch.start_time) return null
  const now = new Date()
  const todayIdx = now.getDay()
  const targets = batch.schedule_days.map((d) => WEEKDAY_INDEX[d]).filter((n) => n !== undefined).sort((a, b) => a - b)
  if (!targets.length) return null
  const [h, m] = batch.start_time.split(':').map(Number)
  for (let add = 0; add < 8; add++) {
    const idx = (todayIdx + add) % 7
    if (!targets.includes(idx)) continue
    const candidate = new Date(now); candidate.setDate(now.getDate() + add); candidate.setHours(h, m, 0, 0)
    if (candidate < now) continue
    const label = add === 0 ? 'Today' : add === 1 ? 'Tomorrow' : candidate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
    const time12 = candidate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    return `${label} · ${time12}`
  }
  return null
}

export function computeAttendancePct(studentId, attendance) {
  const records = attendance.filter((a) => a.student_id === studentId)
  if (!records.length) return null
  return Math.round((records.filter((a) => a.status === 'present').length / records.length) * 100)
}

export function computeOverallProgress(studentId, studentProgressModules) {
  const mine = studentProgressModules.filter((m) => m.student_id === studentId)
  if (!mine.length) return null
  return Math.round(mine.reduce((s, m) => s + m.percent, 0) / mine.length)
}

/**
 * Real, data-derived reasons a student needs staff attention — never
 * fabricated. Mirrors the exact conditions used on the Student Profile
 * page so the list-page "Needs Attention" count and the profile's own
 * banner never disagree.
 */
export function computeNeedsAttention(student, { batch, attendance, studentProgressModules, invoices, academySettings }) {
  if (student.status !== 'active') return []
  const reasons = []
  const attendancePct = computeAttendancePct(student.id, attendance)
  const threshold = getAttendanceThreshold(academySettings)
  if (attendancePct != null && attendancePct < threshold) reasons.push('attendance')

  const overallProgress = computeOverallProgress(student.id, studentProgressModules)
  if (overallProgress != null && batch?.start_date && batch?.end_date && isProgressBehindExpected(overallProgress, batch.start_date, batch.end_date)) {
    reasons.push('progress')
  }

  if (!student.batch_id) reasons.push('batch')

  const invoice = invoices.find((inv) => inv.student === student.name && inv.course === student.course)
  const balance = invoice ? invoice.amount - invoice.paid : 0
  const feeOverdue = invoice && balance > 0 && invoice.due_date && invoice.due_date < new Date().toISOString().slice(0, 10)
  if (feeOverdue) reasons.push('fees')

  return reasons
}
