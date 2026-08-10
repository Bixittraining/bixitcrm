// Central permission config for Attendance & Productivity. Reuses the
// CRM's real roles — admin/manager/sales (profiles.role) — nothing else
// exists (no Counsellor/Trainer/Accountant/Super Admin in this schema).
// "Trainer" access is still derived from batches.instructor_id, same as
// the productivity engine already does — it's a real-data fact, not a
// role, and stays that way here too rather than inventing a role that
// doesn't exist in profiles.
//
// This is a single, editable config object — the same "configurable via
// one place" pattern already used for AUTOMATION_RULES
// (lib/automation.js) and TRAINER_ACTIVITY_METRICS (lib/productivity.js).
// It is NOT a second permission system: it doesn't replace isAdmin/
// isManager/canManageTeam from AuthContext, it's built on top of them and
// used specifically for the finer-grained categories this module needs
// (view/mark/edit/correct/export, own/team/all) that a single boolean
// can't express.

export const ROLE_PERMISSIONS = {
  admin: {
    studentAttendance: ['view', 'mark', 'edit', 'correct', 'delete', 'export'],
    staffAttendance: ['view', 'mark', 'edit', 'correct', 'delete', 'export'],
    loginActivity: ['view'],
    productivity: 'all',
    reports: ['view', 'export'],
    classSchedule: ['view', 'create', 'edit', 'delete'],
    automation: ['view', 'create', 'edit', 'enable_disable'],
  },
  manager: {
    studentAttendance: ['view', 'mark', 'edit', 'correct', 'export'],
    staffAttendance: ['view', 'mark', 'edit', 'export'], // no delete/correct — matches existing canManageTeam scope (admin-only removal elsewhere in this app, e.g. team member deletion)
    loginActivity: [], // RLS (user_sessions_select_own_or_admin) only bypasses for role='admin' — a manager literally cannot read others' sessions at the DB level, so this can't be 'view' without also changing that policy
    productivity: 'team',
    reports: ['view', 'export'],
    classSchedule: ['view'],
    automation: ['view'],
  },
  sales: {
    // Matches existing behavior: any authenticated staff can mark
    // not-yet-marked attendance today (this predates this permissions
    // module and stays unchanged — "preserve existing functionality").
    // Correcting an existing mark and exporting reports stay manager+.
    studentAttendance: ['view', 'mark'],
    staffAttendance: ['view', 'mark'],
    loginActivity: [],
    productivity: 'own',
    reports: ['view'],
    classSchedule: ['view'],
    automation: [],
  },
}

function rolePerms(profile) {
  return ROLE_PERMISSIONS[profile?.roleCode] || ROLE_PERMISSIONS.sales
}

/** Does this profile have `action` on `module` (e.g. 'studentAttendance', 'correct')? */
export function can(profile, moduleName, action) {
  const perms = rolePerms(profile)[moduleName]
  if (!perms) return false
  if (Array.isArray(perms)) return perms.includes(action)
  return true // non-array perms (productivity's scope string) are handled by getProductivityScope, not can()
}

/**
 * 'all' — see and switch between every employee (admin).
 * 'team' — see and switch between every employee (manager; a real
 *   department-scoped "team" would need a manager→department assignment
 *   that doesn't exist yet — flagged in the implementation report).
 * 'own' — locked to their own numbers, no employee picker, no Team View.
 */
export function getProductivityScope(profile) {
  const perms = rolePerms(profile).productivity
  return perms || 'own'
}

/** Trainer-ness is real-data-derived, same rule the productivity engine uses. */
export function isTrainer(profile, batches) {
  return batches.some((b) => b.instructor_id === profile?.id)
}
