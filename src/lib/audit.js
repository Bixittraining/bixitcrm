// Thin wrapper around the audit_logs table (see migration 0033). Not a
// duplicate of the existing integration_audit_log — that one is
// service-role-only and scoped to integrations; this one is user-
// attributed and general-purpose, for "who changed what, from what, to
// what, why" across attendance, class schedules, and reports.

import { supabase } from './supabase'

/**
 * @param {object} p
 * @param {string} p.userId
 * @param {string} p.userName
 * @param {string} p.action     e.g. 'Attendance Corrected'
 * @param {string} p.module     e.g. 'student_attendance'
 * @param {string} [p.entityType]
 * @param {string|number} [p.entityId]
 * @param {*} [p.oldValue]
 * @param {*} [p.newValue]
 * @param {string} [p.reason]
 */
export async function logAuditEvent({ userId, userName, action, module, entityType, entityId, oldValue, newValue, reason }) {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: userId || null,
    user_name: userName || null,
    action,
    module,
    entity_type: entityType || null,
    entity_id: entityId != null ? String(entityId) : null,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    reason: reason || null,
  })
  if (error) console.error('audit_logs insert error', error)
}
