// Productivity calculation service — foundation only, no UI.
//
// Every number here is derived from real CRM tables at call time. Nothing
// is stored, nothing is entered by hand, and a metric with no real data
// source returns { value: null, missing: true, reason } instead of a
// fabricated 0 — 0 means "really zero", missing means "can't be computed
// yet", and a dashboard consuming this should render those two cases
// differently.
//
// ACTIVITY SOURCES INVENTORIED (this project's existing tables — nothing
// new was created to back this; see the accompanying report for detail):
//   leads              — status, assigned_to, date, course
//   follow_ups         — lead (name, no FK), date, status
//   students            — batch_id, enroll_date (admissions/trainer roster)
//   invoices + invoice_installments — amount, paid_amount, status, paid_date
//   lead_notes / student_notes      — author_id, author_name, created_at
//   email_messages      — sender_id, sender_name, created_at
//   whatsapp_messages   — sender ('human'/'contact'/'bot'), NOT per-employee
//   attendance / staff_attendance   — marked_by, marked_by_name, date
//   batches             — instructor_id, schedule_days (trainer scoping)
//   profiles            — role, department (added for Staff Attendance)
// NOT present anywhere in this codebase (see "missing" metrics below):
//   calls / connected calls / talk time — no telephony integration
//   assignments / academic tasks        — no such entity
//   a lead_id/assigned_to on invoices or follow_ups — attribution has to
//     go through a name/email match, same limitation already accepted
//     elsewhere in this codebase (see TeamPerformance.jsx)

// Expected shape of the `data` object every function below takes:
//   {
//     leads, followUps, students, invoices, installments,
//     leadNotes, studentNotes, emailMessages, attendance, staffAttendance,
//     batches, profiles,
//   }
// `leads`/`followUps`/`students`/etc. can come straight from DataContext
// (useData()) as-is. `profiles` is the one exception: DataContext's
// `teamMembers` only carries id/name/role (deliberately narrow — most
// consumers never need more), so a caller needs the richer fetch already
// used by StaffAttendanceList.jsx/LoginActivityList.jsx
// (supabase.from('profiles').select('*')) to get role + department here.

// ---- shared helpers --------------------------------------------------

function inRange(dateStr, from, to) {
  if (!dateStr) return false
  const d = dateStr.slice(0, 10)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

function missing(reason) {
  return { value: null, missing: true, reason }
}

function computed(value, source) {
  return { value, missing: false, source }
}

// Resolves the lead a follow-up or invoice really belongs to. Neither
// table carries a lead_id — follow_ups.lead and invoices.student are both
// plain text names — so this is a best-effort match (email first, since
// it's the more reliable shared identifier; name as a fallback), not a
// real foreign key. Flagged in the report as a genuine data-model gap.
function findLeadByNameOrEmail(leads, name, email) {
  if (email) {
    const byEmail = leads.find((l) => l.email && l.email.toLowerCase() === email.toLowerCase())
    if (byEmail) return byEmail
  }
  return leads.find((l) => l.name === name) || null
}

// ---- individual metrics (single source of truth each, so nothing gets
// counted under two different names) -----------------------------------

function leadsContacted(data, employeeId, from, to) {
  const count = data.leads.filter((l) => l.assigned_to === employeeId && l.status !== 'new' && inRange(l.date, from, to)).length
  return computed(count, 'leads.status != new, assigned_to = employee, leads.date in range')
}

function followUpsCompleted(data, employeeId, from, to) {
  const nameToAssignee = new Map(data.leads.map((l) => [l.name, l.assigned_to]))
  const count = data.followUps.filter((f) => f.status === 'completed' && inRange(f.date, from, to) && nameToAssignee.get(f.lead) === employeeId).length
  return computed(count, 'follow_ups.status = completed, matched to lead by name, follow_ups.date in range')
}

// Sales Executive and Admin both surface this figure but under different
// labels ("Follow-ups Completed" vs "Tasks Completed") — same underlying
// event, computed once and reused, not two separate counts.
function tasksCompleted(data, employeeId, from, to) {
  const result = followUpsCompleted(data, employeeId, from, to)
  return { ...result, source: result.source + ' (no separate task entity exists — follow-ups are the closest real equivalent)' }
}

// Denominator for conversion rate — every lead assigned to this employee
// in range, regardless of status. Not exposed as its own metric (not on
// the requested list) but used below.
function totalLeadsAssigned(data, employeeId, from, to) {
  return data.leads.filter((l) => l.assigned_to === employeeId && inRange(l.date, from, to)).length
}

// Admissions ÷ total leads assigned in range, the same definition already
// used by TeamPerformance.jsx's conversionRate — reused, not reinvented.
function conversionRate(data, employeeId, from, to) {
  const total = totalLeadsAssigned(data, employeeId, from, to)
  const won = admissions(data, employeeId, from, to)
  if (won.missing) return won
  if (total === 0) return computed(null, 'no leads assigned in range')
  return computed(Math.round((won.value / total) * 100), 'admissions ÷ total leads assigned in range (assigned_to = employee, leads.date in range)')
}

function callsMade() { return missing('No telephony integration exists in this CRM — adding this would mean showing a fabricated number.') }
function connectedCalls() { return missing('Same as calls made — no telephony/call data exists.') }
function talkTime() { return missing('Same as calls made — no telephony/call data exists.') }

function admissions(data, employeeId, from, to) {
  const count = data.students.filter((s) => {
    if (!inRange(s.enrollDate, from, to)) return false
    const lead = findLeadByNameOrEmail(data.leads, s.name, s.email)
    return lead?.assigned_to === employeeId
  }).length
  return computed(count, 'students.enroll_date in range, matched to originating lead, lead.assigned_to = employee')
}

// Revenue only counts installments that reached fully-paid status within
// the range (paid_date is only ever set at that point) — a partial
// payment made today against an installment that's still "partial" has
// no date recorded anywhere in this schema, so it can't be included. This
// undercounts true in-range revenue; flagged in the report, not hidden.
function revenue(data, employeeId, from, to) {
  const invoiceById = new Map(data.invoices.map((inv) => [inv.id, inv]))
  const total = data.installments
    .filter((i) => i.status === 'paid' && inRange(i.paid_date, from, to))
    .filter((i) => {
      const invoice = invoiceById.get(i.invoice_id)
      if (!invoice) return false
      const lead = findLeadByNameOrEmail(data.leads, invoice.student, null)
      return lead?.assigned_to === employeeId
    })
    .reduce((sum, i) => sum + Number(i.paid_amount || 0), 0)
  return computed(total, 'invoice_installments.status = paid, paid_date in range, matched to lead by student name')
}

function classesConducted(data, employeeId, from, to) {
  const batchIds = new Set(data.batches.filter((b) => b.instructor_id === employeeId).map((b) => b.id))
  if (batchIds.size === 0) return computed(0, 'no batches instructed by this employee')
  const dates = new Set(
    data.attendance.filter((a) => batchIds.has(a.batch_id) && inRange(a.date, from, to)).map((a) => `${a.batch_id}_${a.date}`)
  )
  return computed(dates.size, 'distinct (batch, date) pairs with attendance recorded, for batches this employee instructs — a proxy for "a class happened", since no separate class-session log exists')
}

function studentsHandled(data, employeeId) {
  const batchIds = new Set(data.batches.filter((b) => b.instructor_id === employeeId).map((b) => b.id))
  const count = data.students.filter((s) => batchIds.has(s.batch_id)).length
  return computed(count, 'current roster size across batches this employee instructs (a snapshot, not a date-ranged event count)')
}

function attendanceMarked(data, employeeId, from, to) {
  const studentCount = data.attendance.filter((a) => a.marked_by === employeeId && inRange(a.date, from, to)).length
  const staffCount = data.staffAttendance.filter((a) => a.marked_by === employeeId && inRange(a.date, from, to)).length
  return computed(studentCount + staffCount, 'attendance.marked_by + staff_attendance.marked_by = employee, date in range')
}

function academicTasksCompleted() { return missing('No assignments/academic-tasks entity exists in this CRM yet.') }

// How many batches this trainer is actively running right now — distinct
// from studentsHandled (roster size) and classesConducted (attendance-days
// taken). A real, simple count from batches.instructor_id, not a log of
// batch edits (no such audit trail exists).
function batchActivities(data, employeeId) {
  const count = data.batches.filter((b) => b.instructor_id === employeeId).length
  return computed(count, 'batches.instructor_id = employee (current count, not date-ranged — a batch doesn\'t stop being "theirs" between classes)')
}

function courseProgress() { return missing('No curriculum/syllabus-completion tracking exists in this CRM yet.') }

// Overall Activity is a transparent, equal-weighted SUM of the countable
// (non-missing) trainer metrics for the range — not a 0-100 "score", not
// weighted by importance, nothing hidden. Change TRAINER_ACTIVITY_METRICS
// to change what counts toward it; that's the one place this is defined.
export const TRAINER_ACTIVITY_METRICS = ['classesConducted', 'attendanceMarked', 'batchActivities']

function overallActivity(bucket) {
  const included = TRAINER_ACTIVITY_METRICS.filter((k) => !bucket[k].missing)
  if (included.length === 0) return missing('No countable trainer activity metrics available.')
  const total = included.reduce((sum, k) => sum + (bucket[k].value || 0), 0)
  return computed(total, `sum of ${included.join(' + ')} for the range — equal-weighted, no scoring formula`)
}

// "CRM Activities" for the Admin bucket — real, attributable actions that
// don't already belong to a Sales metric: notes logged and emails sent.
// lead_activities (the status-change timeline) is deliberately excluded —
// it records what changed but never who changed it, so it can't be
// attributed to an employee without guessing.
function crmActivities(data, employeeId, from, to) {
  const notes = data.leadNotes.filter((n) => n.author_id === employeeId && inRange(n.created_at, from, to)).length
    + data.studentNotes.filter((n) => n.author_id === employeeId && inRange(n.created_at, from, to)).length
  const emails = data.emailMessages.filter((e) => e.sender_id === employeeId && inRange(e.created_at, from, to)).length
  return computed(notes + emails, 'lead_notes + student_notes + email_messages authored by employee, in range (lead_activities excluded — no actor recorded; whatsapp_messages excluded — sender is not per-employee)')
}

// ---- role-aware buckets ------------------------------------------------
// The CRM's actual role column only ever holds admin/manager/sales — there
// is no "trainer" role. Whether Trainer metrics apply is instead derived
// from real data: does this person instruct any batch? A manager who also
// teaches gets both buckets; that's intentional, not a bug — see
// determineApplicableBuckets below.

export function computeSalesBucket(data, employeeId, from, to) {
  return {
    leadsContacted: leadsContacted(data, employeeId, from, to),
    callsMade: callsMade(),
    connectedCalls: connectedCalls(),
    talkTime: talkTime(),
    followUpsCompleted: followUpsCompleted(data, employeeId, from, to),
    tasksCompleted: tasksCompleted(data, employeeId, from, to),
    admissions: admissions(data, employeeId, from, to),
    revenue: revenue(data, employeeId, from, to),
    conversionRate: conversionRate(data, employeeId, from, to),
  }
}

export function computeTrainerBucket(data, employeeId, from, to) {
  const bucket = {
    classesConducted: classesConducted(data, employeeId, from, to),
    studentsHandled: studentsHandled(data, employeeId),
    attendanceMarked: attendanceMarked(data, employeeId, from, to),
    academicTasksCompleted: academicTasksCompleted(),
    batchActivities: batchActivities(data, employeeId),
    courseProgress: courseProgress(),
  }
  bucket.overallActivity = overallActivity(bucket)
  return bucket
}

export function computeAdminBucket(data, employeeId, from, to) {
  return {
    tasksCompleted: tasksCompleted(data, employeeId, from, to),
    crmActivities: crmActivities(data, employeeId, from, to),
  }
}

function determineApplicableBuckets(employee, data) {
  const instructsAnyBatch = data.batches.some((b) => b.instructor_id === employee.id)
  return {
    sales: employee.role === 'sales' || employee.role === 'manager',
    trainer: instructsAnyBatch,
    admin: employee.role === 'admin' || employee.role === 'manager',
  }
}

/**
 * Full productivity picture for one employee. Only computes the buckets
 * that actually apply to them (see determineApplicableBuckets) — a sales
 * rep who doesn't instruct any batch gets `trainer: null`, not a bucket
 * full of zeros that would misleadingly imply they should be teaching.
 */
export function calculateEmployeeProductivity(employeeId, data, filters = {}) {
  const { from = null, to = null } = filters
  const employee = data.profiles.find((p) => p.id === employeeId)
  if (!employee) return null

  const applicable = determineApplicableBuckets(employee, data)
  return {
    employee: { id: employee.id, name: employee.name, role: employee.role, department: employee.department || null },
    range: { from, to },
    sales: applicable.sales ? computeSalesBucket(data, employeeId, from, to) : null,
    trainer: applicable.trainer ? computeTrainerBucket(data, employeeId, from, to) : null,
    admin: applicable.admin ? computeAdminBucket(data, employeeId, from, to) : null,
  }
}

/**
 * Productivity across a filtered set of employees — the Employee/Role/
 * Department/Date-range filter surface this module is required to
 * support. Pass `employeeIds` to scope to specific people, or leave it
 * unset and use `role`/`department` to filter the roster instead.
 */
export function calculateTeamProductivity(data, filters = {}) {
  const { employeeIds = null, role = null, department = null, from = null, to = null } = filters

  const roster = data.profiles.filter((p) => {
    if (employeeIds && !employeeIds.includes(p.id)) return false
    if (role && p.role !== role) return false
    if (department && p.department !== department) return false
    return true
  })

  return roster.map((p) => calculateEmployeeProductivity(p.id, data, { from, to })).filter(Boolean)
}
