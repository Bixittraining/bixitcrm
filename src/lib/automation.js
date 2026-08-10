// Attendance automation — event/action architecture ONLY. Nothing in this
// file sends a WhatsApp message or an email. Every action resolves to a
// logged 'skipped' outcome for now; wiring a real channel later means
// changing runAction() in one place, not touching attendance code at all.
//
// Flow: attendance components call DataContext.markAttendance/
// markStaffAttendance → those call emitAutomationEvent() below (the only
// place that knows about automation) → the event is persisted → configured
// actions run and every one is logged, success or not.

import { supabase } from './supabase'

export const AUTOMATION_EVENTS = {
  STUDENT_ATTENDANCE_MARKED: 'STUDENT_ATTENDANCE_MARKED',
  STUDENT_ABSENT: 'STUDENT_ABSENT',
  STUDENT_LATE: 'STUDENT_LATE',
  STUDENT_ATTENDANCE_BELOW_THRESHOLD: 'STUDENT_ATTENDANCE_BELOW_THRESHOLD',
  STAFF_LATE: 'STAFF_LATE',
  STAFF_ABSENT: 'STAFF_ABSENT',
}

// The threshold STUDENT_ATTENDANCE_BELOW_THRESHOLD checks against. A
// constant, not a magic number buried in a filter — change this to change
// the rule.
export const ATTENDANCE_THRESHOLD_PERCENT = 75

// Configurable rules: event type → actions to run. Editing this object is
// the entire "configuration" surface for now — no admin UI for it yet,
// but nothing about the architecture assumes this stays hardcoded; a
// future settings screen could read/write the same shape from a table
// instead of this constant.
export const AUTOMATION_RULES = {
  [AUTOMATION_EVENTS.STUDENT_ATTENDANCE_MARKED]: [],
  [AUTOMATION_EVENTS.STUDENT_ABSENT]: ['whatsapp_notification', 'email_notification', 'counsellor_notification'],
  [AUTOMATION_EVENTS.STUDENT_LATE]: ['counsellor_notification'],
  [AUTOMATION_EVENTS.STUDENT_ATTENDANCE_BELOW_THRESHOLD]: ['counsellor_notification', 'trainer_notification', 'student_communication'],
  [AUTOMATION_EVENTS.STAFF_LATE]: ['admin_notification'],
  [AUTOMATION_EVENTS.STAFF_ABSENT]: ['admin_notification'],
}

// Every action is "skipped" today — no channel is connected to any of
// these yet (no WhatsApp/Email trigger wiring, no in-app notification
// delivery table). This is the one function a future step changes to
// actually send something; nothing else in this file or its callers
// needs to change when that happens.
async function runAction(action) {
  return { status: 'skipped', error: null, reason: `"${action}" has no connected channel yet — logged for when one is wired up.` }
}

async function logAction(eventId, eventType, entityType, entityId, action) {
  const { status, error, reason } = await runAction(action)
  const { error: insertError } = await supabase.from('automation_logs').insert({
    event_id: eventId,
    trigger: eventType,
    entity_type: entityType,
    entity_id: String(entityId),
    action,
    status,
    error: error || reason || null,
  })
  if (insertError) console.error('automation_logs insert error', insertError)
}

/**
 * Records one attendance-related event and runs whatever actions are
 * configured for it. Safe to call every time attendance is marked —
 * emitting the same (eventType, sourceTable, sourceId) twice is treated
 * as "already handled" via the DB's unique constraint, not an error, so
 * this never produces duplicate log entries for the same underlying
 * attendance record.
 */
export async function emitAutomationEvent({ eventType, entityType, entityId, sourceTable, sourceId, payload = {} }) {
  const { data: event, error } = await supabase
    .from('automation_events')
    .insert({ event_type: eventType, entity_type: entityType, entity_id: String(entityId), source_table: sourceTable, source_id: String(sourceId), payload })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return null // unique violation = duplicate event, not a failure
    console.error('automation_events insert error', error)
    return null
  }

  const actions = AUTOMATION_RULES[eventType] || []
  await Promise.all(actions.map((action) => logAction(event.id, eventType, entityType, entityId, action)))
  return event
}

/**
 * Rolling attendance % for one student across every record on file, run
 * after a new mark to decide whether STUDENT_ATTENDANCE_BELOW_THRESHOLD
 * should fire. `records` is that student's full attendance history
 * (DataContext's `attendance`, pre-filtered to this student_id).
 */
export function isBelowAttendanceThreshold(records) {
  if (!records.length) return null
  const present = records.filter((r) => r.status === 'present').length
  const pct = Math.round((present / records.length) * 100)
  return pct < ATTENDANCE_THRESHOLD_PERCENT ? pct : null
}
