// CRM automation layer — event/action architecture ONLY. Nothing in this
// file sends a WhatsApp message or an email. Every action resolves to a
// logged 'skipped' outcome for now; wiring a real channel later means
// changing runAction() in one place, not touching Attendance, Lead, or any
// other feature's code.
//
// Flow: DataContext (Attendance's markAttendance/markStaffAttendance, and
// the Lead lifecycle functions — addLead/updateLeadStatus/recordPayment/
// etc.) call the emit*Event() helpers below (the only place that knows
// about automation) → the event is persisted to automation_events →
// AUTOMATION_RULES for that event type are evaluated (event → rule →
// conditions → actions) → every resulting action is logged to
// automation_logs, success or not.
//
// Nothing here understands WhatsApp/Email/Telephony as concepts — those are
// a future "Communication Providers" layer that runAction() will delegate
// to. Lead components (Leads.jsx, Pipeline.jsx) never import this file
// directly; only DataContext does, so UI code never needs to know an
// automation engine exists at all.

import { supabase } from './supabase'

export const AUTOMATION_EVENTS = {
  // ── Attendance (existing) ──
  STUDENT_ATTENDANCE_MARKED: 'STUDENT_ATTENDANCE_MARKED',
  STUDENT_ABSENT: 'STUDENT_ABSENT',
  STUDENT_LATE: 'STUDENT_LATE',
  STUDENT_ATTENDANCE_BELOW_THRESHOLD: 'STUDENT_ATTENDANCE_BELOW_THRESHOLD',
  STAFF_LATE: 'STAFF_LATE',
  STAFF_ABSENT: 'STAFF_ABSENT',

  // ── Lead lifecycle ──
  LEAD_CREATED: 'LEAD_CREATED',
  LEAD_ASSIGNED: 'LEAD_ASSIGNED',
  LEAD_STATUS_CHANGED: 'LEAD_STATUS_CHANGED',
  LEAD_CONTACTED: 'LEAD_CONTACTED',
  LEAD_QUALIFIED: 'LEAD_QUALIFIED',
  COUNSELLING_SCHEDULED: 'COUNSELLING_SCHEDULED',
  COUNSELLING_COMPLETED: 'COUNSELLING_COMPLETED',
  COUNSELLING_CANCELLED: 'COUNSELLING_CANCELLED',
  COUNSELLING_NO_SHOW: 'COUNSELLING_NO_SHOW',
  PACKAGE_SHARED: 'PACKAGE_SHARED',
  FOLLOW_UP_CREATED: 'FOLLOW_UP_CREATED',
  FOLLOW_UP_DUE: 'FOLLOW_UP_DUE',
  FOLLOW_UP_OVERDUE: 'FOLLOW_UP_OVERDUE',
  FOLLOW_UP_COMPLETED: 'FOLLOW_UP_COMPLETED',
  LEAD_NEGOTIATION: 'LEAD_NEGOTIATION',
  LEAD_ENROLLED: 'LEAD_ENROLLED',
  LEAD_LOST: 'LEAD_LOST',
  LEAD_REOPENED: 'LEAD_REOPENED',
  NURTURE_DUE: 'NURTURE_DUE',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
}

// The threshold STUDENT_ATTENDANCE_BELOW_THRESHOLD checks against. A
// constant, not a magic number buried in a filter — change this to change
// the rule.
export const ATTENDANCE_THRESHOLD_PERCENT = 75

// A lead's active status maps to at most one "milestone" event — the
// moment it's actually meaningful to react to (e.g. notify/message someone),
// as opposed to LEAD_STATUS_CHANGED which fires on every transition
// regardless of destination. Reopen transitions are handled separately
// (see emitLeadStatusEvents) since landing back on e.g. "contacted" via
// Reopen isn't the same event as genuinely getting contacted again.
export const STATUS_MILESTONE_EVENTS = {
  contacted: AUTOMATION_EVENTS.LEAD_CONTACTED,
  qualified: AUTOMATION_EVENTS.LEAD_QUALIFIED,
  package_shared: AUTOMATION_EVENTS.PACKAGE_SHARED,
  negotiation: AUTOMATION_EVENTS.LEAD_NEGOTIATION,
  lost: AUTOMATION_EVENTS.LEAD_LOST,
  enrolled: AUTOMATION_EVENTS.LEAD_ENROLLED,
}

// Every possible automation_logs.status value — kept as a named export so
// a future UI (e.g. an Automation Log screen) never hardcodes the strings.
export const AUTOMATION_LOG_STATUSES = { PENDING: 'pending', SUCCESS: 'success', SKIPPED: 'skipped', FAILED: 'failed' }

// Human labels for actions — this is the ONLY translation a sales executive
// should ever see ("Follow-up scheduled", not "create_follow_up" or
// anything about rules/conditions/engines). Extend this map, not the UI,
// when a new action type is added.
export const ACTION_LABELS = {
  send_whatsapp: 'WhatsApp message',
  send_email: 'Email',
  send_reminder: 'Reminder',
  assign_sales_executive: 'Sales executive assigned',
  create_follow_up: 'Follow-up scheduled',
  notify_sales_executive: 'Sales executive notified',
  counsellor_notification: 'Counsellor notified',
  trainer_notification: 'Trainer notified',
  admin_notification: 'Admin notified',
  student_communication: 'Student notified',
  whatsapp_notification: 'WhatsApp notification',
  email_notification: 'Email notification',
}
export function actionLabel(action) { return ACTION_LABELS[action] || action }

// Configurable rules: event type → a list of rule entries. Editing this
// object is the entire "configuration" surface for now — no admin UI for
// it yet, but nothing about the architecture assumes this stays hardcoded;
// a future settings screen could read/write the same shape from a table
// instead of this constant.
//
// Each entry is either:
//   - a plain action-name string — an unconditional rule (legacy shape,
//     what every existing Attendance rule below uses): the action always
//     runs when the event fires.
//   - { id, when(payload) => boolean, actions: [...] } — a conditional
//     rule: the actions only run when `when` returns true for that event's
//     payload. This is the EVENT → RULE → CONDITIONS → ACTIONS shape the
//     future engine needs, e.g. "LEAD_CREATED where source = Facebook".
export const AUTOMATION_RULES = {
  [AUTOMATION_EVENTS.STUDENT_ATTENDANCE_MARKED]: [],
  [AUTOMATION_EVENTS.STUDENT_ABSENT]: ['whatsapp_notification', 'email_notification', 'counsellor_notification'],
  [AUTOMATION_EVENTS.STUDENT_LATE]: ['counsellor_notification'],
  [AUTOMATION_EVENTS.STUDENT_ATTENDANCE_BELOW_THRESHOLD]: ['counsellor_notification', 'trainer_notification', 'student_communication'],
  [AUTOMATION_EVENTS.STAFF_LATE]: ['admin_notification'],
  [AUTOMATION_EVENTS.STAFF_ABSENT]: ['admin_notification'],

  // Lead lifecycle — registered and emitted (see DataContext's
  // emitLeadCreatedEvent/emitLeadStatusEvents/emitLeadAssignedEvent/
  // emitPaymentEvent, and addFollowUp/updateFollowUp for the follow-up/
  // counselling ones), but no action actually sends anything yet — see
  // runAction() below. The two entries with real rule objects are a
  // worked example of the intended future shape, not live behavior.
  [AUTOMATION_EVENTS.LEAD_CREATED]: [
    {
      id: 'facebook_lead_welcome',
      when: (payload) => payload?.source === 'Facebook',
      actions: ['assign_sales_executive', 'send_whatsapp', 'send_email', 'create_follow_up'],
    },
  ],
  [AUTOMATION_EVENTS.LEAD_ASSIGNED]: [],
  [AUTOMATION_EVENTS.LEAD_STATUS_CHANGED]: [],
  [AUTOMATION_EVENTS.LEAD_CONTACTED]: [],
  [AUTOMATION_EVENTS.LEAD_QUALIFIED]: [],
  [AUTOMATION_EVENTS.COUNSELLING_SCHEDULED]: [],
  [AUTOMATION_EVENTS.COUNSELLING_COMPLETED]: [],
  [AUTOMATION_EVENTS.COUNSELLING_CANCELLED]: [],
  [AUTOMATION_EVENTS.COUNSELLING_NO_SHOW]: [],
  [AUTOMATION_EVENTS.PACKAGE_SHARED]: [],
  [AUTOMATION_EVENTS.FOLLOW_UP_CREATED]: [],
  // Time-based, not mutation-triggered — there's no cron/scheduled-job
  // infrastructure in this app, so these are emitted from a client-side
  // scan instead: FollowUps.jsx checks its loaded list against "today" on
  // every render (see the useEffect there) and emits DUE/OVERDUE/
  // NURTURE_DUE for whatever qualifies. The dedup constraint on
  // automation_events means that's safe to re-run on every load — each
  // follow-up still only ever logs one of each event.
  [AUTOMATION_EVENTS.FOLLOW_UP_DUE]: [],
  [AUTOMATION_EVENTS.FOLLOW_UP_OVERDUE]: [
    { id: 'overdue_notify_rep', when: null, actions: ['notify_sales_executive', 'send_reminder'] },
  ],
  [AUTOMATION_EVENTS.FOLLOW_UP_COMPLETED]: [],
  [AUTOMATION_EVENTS.LEAD_NEGOTIATION]: [],
  [AUTOMATION_EVENTS.LEAD_ENROLLED]: [],
  [AUTOMATION_EVENTS.LEAD_LOST]: [],
  [AUTOMATION_EVENTS.LEAD_REOPENED]: [],
  // A nurtured lead's check-back date arriving — same client-side-scan
  // shape as FOLLOW_UP_DUE/OVERDUE above (see FollowUps.jsx).
  [AUTOMATION_EVENTS.NURTURE_DUE]: [],
  [AUTOMATION_EVENTS.PAYMENT_PENDING]: [],
  [AUTOMATION_EVENTS.PAYMENT_RECEIVED]: [],
}

// Every action is "skipped" today — no channel is connected to any of
// these yet (no WhatsApp/Email trigger wiring, no in-app notification
// delivery table). This is the one function a future step changes to
// actually send something; nothing else in this file or its callers
// needs to change when that happens. When a real channel IS wired here,
// it should return 'success' or 'failed' — never let a thrown error
// escape, since a failed send must never be allowed to fail the lead
// update that triggered it (see emitAutomationEvent/emitLeadEvent below,
// which are always called without awaiting their result upstream).
async function runAction(action) {
  return { status: AUTOMATION_LOG_STATUSES.SKIPPED, error: null, reason: `"${action}" has no connected channel yet — logged for when one is wired up.` }
}

async function logAction(eventId, eventType, entityType, entityId, ruleId, action) {
  const { status, error, reason } = await runAction(action)
  const { error: insertError } = await supabase.from('automation_logs').insert({
    event_id: eventId,
    trigger: eventType,
    entity_type: entityType,
    entity_id: String(entityId),
    rule: ruleId,
    action,
    status,
    error: error || reason || null,
  })
  if (insertError) console.error('automation_logs insert error', insertError)
}

// Resolves AUTOMATION_RULES[eventType] against this event's payload into a
// flat { ruleId, action } list — the CONDITIONS step of EVENT → RULE →
// CONDITIONS → ACTIONS. A rule with no `when` (or a falsy one) is
// unconditional, matching every occurrence of its event.
function resolveRuleActions(eventType, payload) {
  const entries = AUTOMATION_RULES[eventType] || []
  const resolved = []
  for (const entry of entries) {
    if (typeof entry === 'string') { resolved.push({ ruleId: null, action: entry }); continue }
    const matches = typeof entry.when === 'function' ? entry.when(payload) : true
    if (!matches) continue
    for (const action of entry.actions) resolved.push({ ruleId: entry.id || null, action })
  }
  return resolved
}

/**
 * Records one event and runs whatever actions its matching rules resolve
 * to. Safe to call every time — emitting the same (eventType, sourceTable,
 * sourceId) twice is treated as "already handled" via the DB's unique
 * constraint, not an error, so this never produces duplicate log entries
 * for the same underlying record/transition.
 *
 * Never throws, and never awaited by its callers in DataContext — an
 * automation failure (or this call itself failing) must never fail the
 * Lead/Attendance mutation that triggered it. See "Known limitations" in
 * the phase hand-off notes for what that implies about surfacing failures
 * to the user today.
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

  const actions = resolveRuleActions(eventType, payload)
  await Promise.all(actions.map(({ ruleId, action }) => logAction(event.id, eventType, entityType, entityId, ruleId, action)))

  // Hand the event to the Central Automation Engine (Supabase Edge
  // Function) so any matching WHEN/IF/THEN workflow can run — matching is
  // real DB work (conditions read live lead/invoice/follow-up data) so it
  // belongs server-side, not here. Deliberately not awaited: workflow
  // execution must never slow down the CRM action that caused this event
  // (see spec's Performance requirement). A failure here is swallowed —
  // it must never surface as a failure of the lead mutation that emitted
  // the event.
  if (entityType === 'lead') {
    supabase.functions.invoke('automation-engine', { body: { mode: 'trigger', eventId: event.id } }).catch((err) => {
      console.error('automation-engine trigger invoke failed', err)
    })
  }

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

// ─── LEAD EVENT HELPERS ─────────────────────────────────────────────────
// The only place that knows what a Lead automation event payload looks
// like. Deliberately NOT the whole lead record — just enough for a future
// rule/condition or message template to work with (see "Event Structure"
// in the phase hand-off notes): who/what/when, the status transition if
// any, and the fields a rule is likely to condition on (source/course/
// assigned executive), plus a related entity id (invoice, follow-up, etc.)
// where relevant.
export function buildLeadEventPayload(lead, { userId, previousStatus, newStatus, relatedEntityId } = {}) {
  return {
    userId: userId ?? null,
    previousStatus: previousStatus ?? null,
    newStatus: newStatus ?? null,
    source: lead?.source ?? null,
    course: lead?.course ?? null,
    assignedExecutive: lead?.assigned_to ?? null,
    relatedEntityId: relatedEntityId ?? null,
  }
}

export function emitLeadCreatedEvent({ lead, userId }) {
  return emitAutomationEvent({
    eventType: AUTOMATION_EVENTS.LEAD_CREATED,
    entityType: 'lead',
    entityId: lead.id,
    sourceTable: 'leads',
    sourceId: lead.id,
    payload: buildLeadEventPayload(lead, { userId, newStatus: lead.status }),
  })
}

export function emitLeadAssignedEvent({ lead, leadId, userId, assignedExecutive }) {
  const id = leadId ?? lead?.id
  return emitAutomationEvent({
    eventType: AUTOMATION_EVENTS.LEAD_ASSIGNED,
    entityType: 'lead',
    entityId: id,
    sourceTable: 'leads',
    // Reassignment/take-over can legitimately happen more than once for
    // the same lead, so this event isn't a per-lead singleton like
    // LEAD_CREATED — the timestamp keeps every occurrence distinct.
    sourceId: `${id}:${Date.now()}`,
    payload: { ...buildLeadEventPayload(lead, { userId }), assignedExecutive: assignedExecutive ?? lead?.assigned_to ?? null },
  })
}

/**
 * The one function that knows how to turn a lead status transition into
 * the right automation event(s): LEAD_STATUS_CHANGED fires every time
 * (never deduplicated — every transition is a distinct occurrence), plus a
 * milestone event when the destination status is one of
 * STATUS_MILESTONE_EVENTS (deduplicated per lead — a lead only "becomes
 * Qualified" once in any meaningful sense). A Reopen transition
 * (activityType === 'LEAD_REOPENED') fires LEAD_REOPENED instead of
 * re-triggering whatever stage it reopened onto.
 */
export async function emitLeadStatusEvents({ lead, leadId, userId, previousStatus, newStatus, activityType }) {
  const id = leadId ?? lead?.id
  const payload = buildLeadEventPayload(lead, { userId, previousStatus, newStatus })
  await emitAutomationEvent({
    eventType: AUTOMATION_EVENTS.LEAD_STATUS_CHANGED,
    entityType: 'lead', entityId: id, sourceTable: 'leads', sourceId: `${id}:${Date.now()}`, payload,
  })
  if (activityType === 'LEAD_REOPENED') {
    await emitAutomationEvent({
      eventType: AUTOMATION_EVENTS.LEAD_REOPENED,
      entityType: 'lead', entityId: id, sourceTable: 'leads', sourceId: `${id}:${Date.now()}`, payload,
    })
    return
  }
  const milestone = STATUS_MILESTONE_EVENTS[newStatus]
  if (milestone) {
    await emitAutomationEvent({
      eventType: milestone,
      entityType: 'lead', entityId: id, sourceTable: 'leads', sourceId: String(id), payload,
    })
  }
}

export function emitPaymentEvent({ eventType, lead, invoiceId, userId, amount }) {
  return emitAutomationEvent({
    eventType,
    entityType: 'lead',
    entityId: lead?.id ?? null,
    sourceTable: 'invoices',
    // A fee bill enters "pending" once (per invoice) — but a lead can
    // receive several distinct payments against the same invoice, so only
    // PAYMENT_PENDING is deduplicated per invoice; PAYMENT_RECEIVED needs a
    // unique key per payment.
    sourceId: eventType === AUTOMATION_EVENTS.PAYMENT_PENDING ? String(invoiceId) : `${invoiceId}:${Date.now()}`,
    payload: { ...buildLeadEventPayload(lead, { userId, relatedEntityId: invoiceId }), amount: amount ?? null },
  })
}
