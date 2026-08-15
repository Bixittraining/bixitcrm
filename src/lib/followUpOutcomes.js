// Single source of truth for "Complete Follow-up"'s outcome dialog and
// what happens next. This is the WHOLE business-workflow layer the
// Follow-up module is built around: OUTCOME -> business category
// (CONTINUE / NURTURE / CLOSE) -> suggested next step. DataContext's
// completeFollowUpOutcome() is the only thing that reads this to decide
// what to do — the UI only ever needs the label a rep sees.
//
// RNR is scoped to 'call' only (spec: "RNR means Ring No Response... a
// call outcome"). Every other outcome is offered wherever it makes
// business sense — a WhatsApp follow-up can still lead to "Interested" or
// "Not Interested" even though nobody was "called".
export const OUTCOMES = {
  connected: { label: 'Connected', category: 'CONTINUE' },
  rnr: { label: 'RNR / No Response', category: 'CONTINUE' },
  interested: { label: 'Interested', category: 'CONTINUE' },
  needs_more_time: { label: 'Needs More Time', category: 'NURTURE' },
  requested_callback: { label: 'Requested Callback', category: 'CONTINUE' },
  package_shared: { label: 'Package Shared', category: 'CONTINUE' },
  payment_discussion: { label: 'Payment Discussion', category: 'CONTINUE' },
  ready_to_enroll: { label: 'Ready to Enroll', category: 'CONTINUE' },
  not_interested: { label: 'Not Interested', category: 'CLOSE' },
  other: { label: 'Other', category: 'CONTINUE' },
}

// Meetings (Counselling) already have their own richer outcome flow —
// DataContext.recordMeetingOutcome, driven by the Lead Detail Meeting tab.
// The Follow-up module's outcome dialog defers to that instead of
// duplicating it (see completeFollowUpOutcome).
export const OUTCOMES_BY_TYPE = {
  call: ['connected', 'rnr', 'interested', 'needs_more_time', 'requested_callback', 'not_interested', 'other'],
  whatsapp: ['connected', 'interested', 'needs_more_time', 'requested_callback', 'not_interested', 'other'],
  package: ['interested', 'needs_more_time', 'payment_discussion', 'ready_to_enroll', 'not_interested', 'other'],
  payment: ['payment_discussion', 'ready_to_enroll', 'needs_more_time', 'not_interested', 'other'],
  document: ['connected', 'needs_more_time', 'not_interested', 'other'],
  general: ['connected', 'interested', 'needs_more_time', 'requested_callback', 'package_shared', 'payment_discussion', 'ready_to_enroll', 'not_interested', 'other'],
}

export function outcomesForType(type) {
  return (OUTCOMES_BY_TYPE[type] || OUTCOMES_BY_TYPE.general).map((key) => ({ key, ...OUTCOMES[key] }))
}

// What a reasonable next step looks like for each outcome — the dialog
// shows this as a suggestion, never a forced action (spec section 5/23:
// "allow the user to skip or change the suggested next action").
//   'reschedule'   — offer Tomorrow/3 Days/7 Days/Custom, creates one new follow-up of the SAME type
//   'schedule_meeting' — offer to schedule a Counselling session
//   'schedule_followup_typed' — offer to schedule a follow-up of a specific type (followupType)
//   'nurture'      — offer to move the lead to Nurture (with a check-back date)
//   'admission'    — open the existing Admission/Enrollment workflow
//   'close'        — ask for a reason and close the lead (Not Interested)
//   'none'         — nothing forced; Next Action will fall back to "Schedule follow-up" if needed
export const OUTCOME_NEXT_ACTION = {
  connected: { kind: 'none' },
  rnr: { kind: 'reschedule', presetDays: [1, 3, 7] },
  interested: { kind: 'schedule_meeting' },
  needs_more_time: { kind: 'nurture' },
  requested_callback: { kind: 'reschedule', presetDays: [1, 3, 7] },
  package_shared: { kind: 'schedule_followup_typed', followupType: 'package' },
  payment_discussion: { kind: 'schedule_followup_typed', followupType: 'payment' },
  ready_to_enroll: { kind: 'admission' },
  not_interested: { kind: 'close' },
  other: { kind: 'none' },
}

// Spec section 8's exact reason list for closing a lead from the "Not
// Interested" outcome. Deliberately separate from Leads.jsx's broader
// lostReasons (used by the admin-facing "Mark Lost" action) — same
// underlying field (leads.closure_reason), different, narrower vocabulary
// for this specific, more common path.
export const NOT_INTERESTED_REASONS = ['Price', 'Course Not Suitable', 'Timing', 'Joined Elsewhere', 'Other']

export const RESCHEDULE_PRESETS = [
  { days: 1, label: 'Tomorrow' },
  { days: 3, label: 'In 3 Days' },
  { days: 7, label: 'In 7 Days' },
]
